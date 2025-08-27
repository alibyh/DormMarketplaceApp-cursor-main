# Product-Centric Chat System

## 🎯 **What This System Does**

This is a **true product-centric chat system** where:

- **Each product creates a separate conversation** (even with the same seller)
- **Product details are always displayed** (name, image, price, dorm)
- **Buyer and seller avatars** are shown on each conversation
- **No grouping** - each product = separate conversation thread

## 🚀 **How It Works**

### **Conversation Creation**
When a buyer clicks "Message" on a product:
1. **Unique conversation ID** is created: `product_{productId}_{buyerId}_{sellerId}`
2. **Product details** are stored with the conversation
3. **Separate conversation** for each product (even same seller)

### **Example Scenarios**
- **Scenario 1**: Buyer messages seller about "iPhone 15" → Conversation A
- **Scenario 2**: Same buyer messages same seller about "MacBook Pro" → Conversation B (separate!)
- **Scenario 3**: Different buyer messages same seller about "iPhone 15" → Conversation C (separate!)

## 📱 **UI Features**

### **Conversations List**
- **Main photo**: Product image (or icon if no image)
- **Product name**: Displayed prominently
- **Product price**: Shown when available
- **Type badge**: "Sale" or "Want" indicator
- **Small avatars**: Buyer and seller overlaid on product image
- **User role**: Shows if you're "buyer" or "seller"

### **Chat Header**
- **Product image**: Main header image
- **Product name**: Header title
- **Product price**: Shown below name
- **Participant avatars**: Small buyer/seller avatars

## 🛠 **Setup Required**

### **Step 1: Run Migration**
Execute this SQL in your Supabase SQL Editor:

```sql
-- Run scripts/migrate-to-product-conversations.sql
```

### **Step 2: Test the System**
1. Create a product listing
2. Message the seller from product details
3. Check conversations list - should show product-centric layout
4. Send another message from a different product to same seller
5. Verify you get separate conversations

## 🎨 **Visual Design**

### **Conversation Item Layout**
```
┌─────────────────────────────────────┐
│ [Product Image] [B][S] [Sale/Want]  │
│ Product Name              $Price    │
│ Last message...           Time      │
│                          [Role]     │
└─────────────────────────────────────┘
```

### **Chat Header Layout**
```
┌─────────────────────────────────────┐
│ [Product] Product Name    [B][S]    │
│           $Price                    │
└─────────────────────────────────────┘
```

## 🔧 **Technical Details**

### **Database Schema**
```sql
conversations table:
- conversation_id: TEXT (product_{id}_{buyer}_{seller})
- product_id: UUID
- product_name: TEXT
- product_image: TEXT
- product_type: TEXT ('product' or 'buy_order')
- product_price: DECIMAL
- product_dorm: TEXT
- buyer_id: UUID
- seller_id: UUID
- participant_ids: UUID[]
```

### **Key Benefits**
✅ **No conversation grouping** - each product is separate  
✅ **Product context always visible** - never lose track of what you're discussing  
✅ **Better UX** - clear visual hierarchy with product as main focus  
✅ **Scalable** - works for any number of products between same users  

## 🎉 **Result**

A much more intuitive and visually appealing chat system that puts products at the center of every conversation! 🎯✨
