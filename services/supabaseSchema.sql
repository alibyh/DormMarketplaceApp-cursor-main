-- Schema for Supabase
-- Run these SQL commands in the Supabase SQL Editor to set up your database

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.settings.app_id" TO 'dormmarketplace';

-- Create profiles table (extension of auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  dorm TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  dorm TEXT,
  seller_id UUID REFERENCES public.profiles(id) NOT NULL,
  main_image_url TEXT,
  is_deleted BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Product policies
CREATE POLICY "Products are viewable by everyone" 
  ON public.products 
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Users can create products" 
  ON public.products 
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own products" 
  ON public.products 
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own products" 
  ON public.products 
  FOR DELETE USING (auth.uid() = seller_id);

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Product images policies
CREATE POLICY "Product images are viewable by everyone" 
  ON public.product_images 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert images for their own products" 
  ON public.product_images 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for their own products" 
  ON public.product_images 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT UNIQUE NOT NULL,
  participant_ids UUID[] NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can view their own conversations" 
  ON public.conversations 
  FOR SELECT USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations they're part of" 
  ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update conversations they're part of" 
  ON public.conversations 
  FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  read_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Message policies
CREATE POLICY "Users can view messages in their conversations" 
  ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversation_id = messages.conversation_id 
      AND auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Users can insert messages in their conversations" 
  ON public.messages 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversation_id = messages.conversation_id 
      AND auth.uid() = ANY(participant_ids)
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update messages they've read" 
  ON public.messages 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversation_id = messages.conversation_id 
      AND auth.uid() = ANY(participant_ids)
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('product_images', 'product_images', TRUE);

-- Storage bucket policies
CREATE POLICY "Avatar images are publicly accessible" 
  ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar" 
  ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own avatar" 
  ON storage.objects 
  FOR UPDATE USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete their own avatar" 
  ON storage.objects 
  FOR DELETE USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Product images are publicly accessible" 
  ON storage.objects 
  FOR SELECT USING (bucket_id = 'product_images');

CREATE POLICY "Users can upload product images" 
  ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'product_images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own product images" 
  ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'product_images' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.products WHERE seller_id = auth.uid()
    )
  );

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE PROCEDURE update_modified_column(); 