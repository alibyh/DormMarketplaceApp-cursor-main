# Testing Product Deletion Handling

## Overview
This guide helps verify that when a product is deleted, it's properly handled in conversation and chat screens using placeholder images and "Deleted Item" text.

## Prerequisites
1. Run the migration script: `scripts/add-product-deletion-tracking.sql`
2. Ensure you have test products and conversations

## Test Steps

### 1. Database Setup
```sql
-- Run the migration script in Supabase SQL Editor
-- This adds is_deleted field to buy_orders and product_deleted to conversations
```

### 2. Test Product Deletion
1. **Create a test product** and start a conversation about it
2. **Delete the product** (mark as `is_deleted = true`)
3. **Verify the conversation** still shows but with "Deleted Item" and placeholder image

### 3. Test Buy Order Deletion
1. **Create a test buy order** and start a conversation about it
2. **Delete the buy order** (mark as `is_deleted = true`)
3. **Verify the conversation** still shows but with "Deleted Item" and placeholder image

### 4. UI Verification

#### Conversations Screen
- ✅ **Product image** shows placeholder (`deleted_product_placeholder.webp`)
- ✅ **Product name** shows "Deleted Item" (translated)
- ✅ **Conversation still opens** when tapped
- ✅ **Other user info** still displays correctly

#### Chat Screen
- ✅ **Product info card** shows placeholder image
- ✅ **Product name** shows "Deleted Item" (translated)
- ✅ **Messages still display** correctly
- ✅ **Cannot send messages** to deleted users (if applicable)

### 5. Manual Database Tests

#### Test Product Deletion
```sql
-- Mark a product as deleted
UPDATE products 
SET is_deleted = true 
WHERE id = 'your-product-id';

-- Verify conversation is marked
SELECT product_deleted FROM conversations 
WHERE product_id = 'your-product-id';
```

#### Test Buy Order Deletion
```sql
-- Mark a buy order as deleted
UPDATE buy_orders 
SET is_deleted = true 
WHERE id = 'your-buy-order-id';

-- Verify conversation is marked
SELECT product_deleted FROM conversations 
WHERE product_id = 'your-buy-order-id';
```

### 6. Edge Cases to Test
1. **Product deleted before conversation** - should show "Deleted Item"
2. **Product deleted after conversation** - should update to show "Deleted Item"
3. **Multiple products deleted** - all conversations should handle correctly
4. **Mixed deleted/non-deleted** - conversations should show correct state

### 7. Expected Behavior

#### When Product is Deleted:
- ✅ **Conversation list**: Shows placeholder image and "Deleted Item"
- ✅ **Chat screen**: Shows placeholder image and "Deleted Item" in product info
- ✅ **Messages**: Continue to display normally
- ✅ **Navigation**: Conversation still opens and functions

#### When Product is Not Deleted:
- ✅ **Conversation list**: Shows actual product image and name
- ✅ **Chat screen**: Shows actual product image and name in product info
- ✅ **All functionality**: Works as expected

## Troubleshooting

### Common Issues:
1. **Placeholder not showing**: Check if `deleted_product_placeholder.webp` exists in assets
2. **Translation not working**: Verify `deletedProduct` key exists in i18n files
3. **Database not updated**: Run migration script and check column exists
4. **Triggers not working**: Verify triggers are created and enabled

### Debug Commands:
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name = 'product_deleted';

-- Check if triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'products';

-- Test trigger manually
UPDATE products SET is_deleted = true WHERE id = 'test-id';
SELECT product_deleted FROM conversations WHERE product_id = 'test-id';
```

## Success Criteria
- ✅ All deleted products show placeholder images
- ✅ All deleted products show "Deleted Item" text
- ✅ Conversations remain functional
- ✅ No errors in console
- ✅ UI remains responsive and user-friendly
