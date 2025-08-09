// migrate.js - Script to migrate data from Back4App (Parse) to Supabase
import Parse from 'parse/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Initialize Parse
Parse.initialize(
  'SfShHsURknABJMyp8t50pWFYEuOsjrFJsicor0Lt', // Your Parse App ID
  'jzzIQueMpTn46lZPCL6c8VmzBtdrvXA4tNQt2EHE', // Your Parse JavaScript Key
  'YOUR_PARSE_MASTER_KEY' // Your Parse Master Key (needed for some operations)
);
Parse.serverURL = 'https://dorms.b4a.io/parse';

// Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Directory to temporarily store files
const TEMP_DIR = path.join(__dirname, 'temp_files');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Migrate users and profiles
async function migrateUsers() {
  console.log('Starting user migration...');
  
  const query = new Parse.Query(Parse.User);
  query.limit(1000); // Adjust based on your user count
  
  const parseUsers = await query.find({ useMasterKey: true });
  console.log(`Found ${parseUsers.length} users to migrate`);
  
  for (const parseUser of parseUsers) {
    try {
      const userData = {
        email: parseUser.get('email'),
        password: 'TemporaryPassword123!', // Users will need to reset their password
        email_confirm: true
      };
      
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser(userData);
      
      if (authError) {
        console.error(`Error creating auth user for ${parseUser.get('username')}:`, authError);
        continue;
      }
      
      // Create profile in Supabase
      const profileData = {
        id: authUser.user.id,
        username: parseUser.get('username'),
        email: parseUser.get('email'),
        dorm: parseUser.get('dorm') || null,
        created_at: parseUser.get('createdAt').toISOString(),
        updated_at: parseUser.get('updatedAt').toISOString()
      };
      
      // Handle avatar if exists
      const parseAvatar = parseUser.get('avatar');
      if (parseAvatar) {
        const avatarUrl = parseAvatar.url();
        const avatarFilename = `${authUser.user.id}_avatar.jpg`;
        const avatarPath = path.join(TEMP_DIR, avatarFilename);
        
        // Download the file
        const response = await fetch(avatarUrl);
        const buffer = await response.buffer();
        fs.writeFileSync(avatarPath, buffer);
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${authUser.user.id}/${avatarFilename}`, fs.createReadStream(avatarPath));
        
        if (uploadError) {
          console.error(`Error uploading avatar for ${parseUser.get('username')}:`, uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(`${authUser.user.id}/${avatarFilename}`);
          
          profileData.avatar_url = urlData.publicUrl;
        }
        
        // Clean up temp file
        fs.unlinkSync(avatarPath);
      }
      
      // Insert profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);
      
      if (profileError) {
        console.error(`Error creating profile for ${parseUser.get('username')}:`, profileError);
      } else {
        console.log(`Migrated user: ${parseUser.get('username')}`);
      }
    } catch (error) {
      console.error(`Error migrating user ${parseUser.get('username')}:`, error);
    }
  }
  
  console.log('User migration completed');
}

// Migrate products
async function migrateProducts() {
  console.log('Starting product migration...');
  
  const query = new Parse.Query('Product');
  query.include('seller');
  query.limit(1000); // Adjust based on your product count
  
  const parseProducts = await query.find({ useMasterKey: true });
  console.log(`Found ${parseProducts.length} products to migrate`);
  
  for (const parseProduct of parseProducts) {
    try {
      const parseSeller = parseProduct.get('seller');
      
      // Find the corresponding Supabase user
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', parseSeller.get('username'))
        .single();
      
      if (sellerError) {
        console.error(`Error finding seller for product ${parseProduct.get('name')}:`, sellerError);
        continue;
      }
      
      // Create product in Supabase
      const productData = {
        name: parseProduct.get('name'),
        description: parseProduct.get('description'),
        price: parseProduct.get('price'),
        dorm: parseProduct.get('dorm') || null,
        seller_id: sellerData.id,
        is_deleted: parseProduct.get('isDeleted') || false,
        is_visible: parseProduct.get('isVisible') !== false, // Default to true if not set
        created_at: parseProduct.get('createdAt').toISOString(),
        updated_at: parseProduct.get('updatedAt').toISOString()
      };
      
      const { data: insertedProduct, error: productError } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      if (productError) {
        console.error(`Error creating product ${parseProduct.get('name')}:`, productError);
        continue;
      }
      
      // Handle product photos
      const parsePhotos = parseProduct.get('photos') || [];
      if (parsePhotos.length > 0) {
        let mainImageUrl = null;
        
        for (let i = 0; i < parsePhotos.length; i++) {
          const photo = parsePhotos[i];
          const photoUrl = photo.url();
          const photoFilename = `product_${i + 1}.jpg`;
          const photoPath = path.join(TEMP_DIR, photoFilename);
          
          // Download the file
          const response = await fetch(photoUrl);
          const buffer = await response.buffer();
          fs.writeFileSync(photoPath, buffer);
          
          // Upload to Supabase Storage
          const filePath = `products/${insertedProduct.id}/${photoFilename}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product_images')
            .upload(filePath, fs.createReadStream(photoPath));
          
          if (uploadError) {
            console.error(`Error uploading photo for product ${parseProduct.get('name')}:`, uploadError);
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('product_images')
              .getPublicUrl(filePath);
            
            // Save image reference in product_images table
            const { error: imageError } = await supabase
              .from('product_images')
              .insert([{
                product_id: insertedProduct.id,
                image_url: urlData.publicUrl,
                file_path: filePath
              }]);
            
            if (imageError) {
              console.error(`Error saving image reference for product ${parseProduct.get('name')}:`, imageError);
            }
            
            // Set the first image as main image
            if (i === 0) {
              mainImageUrl = urlData.publicUrl;
            }
          }
          
          // Clean up temp file
          fs.unlinkSync(photoPath);
        }
        
        // Update product with main image URL
        if (mainImageUrl) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ main_image_url: mainImageUrl })
            .eq('id', insertedProduct.id);
          
          if (updateError) {
            console.error(`Error updating main image for product ${parseProduct.get('name')}:`, updateError);
          }
        }
      }
      
      console.log(`Migrated product: ${parseProduct.get('name')}`);
    } catch (error) {
      console.error(`Error migrating product ${parseProduct.get('name')}:`, error);
    }
  }
  
  console.log('Product migration completed');
}

// Migrate conversations and messages
async function migrateConversations() {
  console.log('Starting conversation migration...');
  
  const query = new Parse.Query('Conversation');
  query.include('participants');
  query.limit(1000); // Adjust based on your conversation count
  
  const parseConversations = await query.find({ useMasterKey: true });
  console.log(`Found ${parseConversations.length} conversations to migrate`);
  
  for (const parseConversation of parseConversations) {
    try {
      const parseParticipants = parseConversation.get('participants') || [];
      const conversationId = parseConversation.get('conversationId');
      
      if (parseParticipants.length < 2 || !conversationId) {
        console.log(`Skipping invalid conversation: ${parseConversation.id}`);
        continue;
      }
      
      // Get Supabase user IDs for participants
      const participantIds = [];
      for (const parseParticipant of parseParticipants) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', parseParticipant.get('username'))
          .single();
        
        if (userError) {
          console.error(`Error finding user ${parseParticipant.get('username')}:`, userError);
          continue;
        }
        
        participantIds.push(userData.id);
      }
      
      if (participantIds.length < 2) {
        console.log(`Skipping conversation with insufficient valid participants: ${conversationId}`);
        continue;
      }
      
      // Create conversation in Supabase
      const conversationData = {
        conversation_id: conversationId,
        participant_ids: participantIds,
        last_message: parseConversation.get('lastMessage') || '',
        last_message_at: parseConversation.get('lastMessageAt')?.toISOString() || parseConversation.get('updatedAt').toISOString(),
        created_at: parseConversation.get('createdAt').toISOString(),
        updated_at: parseConversation.get('updatedAt').toISOString()
      };
      
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert([conversationData]);
      
      if (conversationError) {
        console.error(`Error creating conversation ${conversationId}:`, conversationError);
        continue;
      }
      
      // Migrate messages for this conversation
      await migrateMessagesForConversation(conversationId, participantIds);
      
      console.log(`Migrated conversation: ${conversationId}`);
    } catch (error) {
      console.error(`Error migrating conversation:`, error);
    }
  }
  
  console.log('Conversation migration completed');
}

// Helper function to migrate messages for a specific conversation
async function migrateMessagesForConversation(conversationId, participantIds) {
  const query = new Parse.Query('Message');
  query.equalTo('conversationId', conversationId);
  query.include('senderId');
  query.ascending('createdAt');
  query.limit(1000); // Adjust based on your message count
  
  const parseMessages = await query.find({ useMasterKey: true });
  console.log(`Found ${parseMessages.length} messages for conversation ${conversationId}`);
  
  for (const parseMessage of parseMessages) {
    try {
      const parseSender = parseMessage.get('senderId');
      
      if (!parseSender) {
        console.log(`Skipping message with no sender: ${parseMessage.id}`);
        continue;
      }
      
      // Find the corresponding Supabase user
      const { data: senderData, error: senderError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', parseSender.get('username'))
        .single();
      
      if (senderError) {
        console.error(`Error finding sender for message:`, senderError);
        continue;
      }
      
      // Get read status
      const parseReadBy = parseMessage.get('readBy') || [];
      const readBy = [];
      
      for (const parseReader of parseReadBy) {
        const { data: readerData, error: readerError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', parseReader.get('username'))
          .single();
        
        if (!readerError) {
          readBy.push(readerData.id);
        }
      }
      
      // Create message in Supabase
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderData.id,
        content: parseMessage.get('content') || '',
        read_by: readBy,
        created_at: parseMessage.get('createdAt').toISOString(),
        updated_at: parseMessage.get('updatedAt').toISOString()
      };
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert([messageData]);
      
      if (messageError) {
        console.error(`Error creating message:`, messageError);
      }
    } catch (error) {
      console.error(`Error migrating message:`, error);
    }
  }
}

// Main migration function
async function migrate() {
  try {
    // Run migrations in sequence
    await migrateUsers();
    await migrateProducts();
    await migrateConversations();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }
}

// Run the migration
migrate().catch(console.error); 