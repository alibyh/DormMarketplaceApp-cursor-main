# Troubleshooting: Placeholders Not Showing

## 🚨 Problem:
Placeholder images and "Deleted Item" text are not showing when products are deleted.

## 🔍 Step-by-Step Debugging:

### **Step 1: Check Database State**
Run this script in Supabase SQL Editor:
```sql
-- scripts/debug-placeholder-issue.sql
```

This will show you:
- ✅ If required columns exist
- ✅ Current products and their deletion status
- ✅ Current conversations and their product_deleted status
- ✅ Any deleted products
- ✅ If triggers exist

### **Step 2: Check Console Logs**
Open your app and check the console for debug logs:
- Look for "Product in conversation:" logs
- Look for "Product data in message service:" logs
- Check for any error messages

### **Step 3: Manual Test**
Run this script to manually test:
```sql
-- scripts/test-placeholder-manually.sql
```

Follow the steps to:
1. Find a product ID
2. Mark it as deleted
3. Update the conversation
4. Check the app

### **Step 4: Verify Placeholder Files**
The placeholder files should exist:
- ✅ `assets/deleted_product_placeholder.webp` (6KB)
- ✅ `assets/deleted_user_placeholder.png` (4.3KB)

## 🔧 Common Issues and Fixes:

### **Issue 1: Database Columns Don't Exist**
**Symptoms**: Database errors in console
**Fix**: Run the database setup script
```sql
-- scripts/add-product-deletion-trigger.sql
```

### **Issue 2: Product Not Actually Deleted**
**Symptoms**: Product still shows normal info
**Check**: 
```sql
SELECT id, name, is_deleted FROM products WHERE id = 'your-product-id';
```
**Fix**: Make sure `is_deleted = true`

### **Issue 3: Conversation Not Updated**
**Symptoms**: Product deleted but conversation still shows normal product
**Check**:
```sql
SELECT product_id, product_deleted FROM conversations WHERE product_id = 'your-product-id';
```
**Fix**: Make sure `product_deleted = true`

### **Issue 4: Frontend Not Refreshing**
**Symptoms**: Database shows correct data but app doesn't update
**Fix**: 
1. Pull to refresh conversations
2. Navigate away and back to conversations
3. Restart the app

### **Issue 5: Debug Logs Not Showing**
**Symptoms**: No console logs about products
**Check**: Make sure you're in development mode (`__DEV__` is true)
**Fix**: Check if the conversation has product data

## 🧪 Testing Checklist:

### **Database Check:**
- [ ] `products.is_deleted` column exists
- [ ] `conversations.product_deleted` column exists
- [ ] Product has `is_deleted = true`
- [ ] Conversation has `product_deleted = true`

### **Frontend Check:**
- [ ] Console shows debug logs
- [ ] Product shows "Deleted Item" text
- [ ] Product shows placeholder image
- [ ] No errors in console

### **App Check:**
- [ ] Conversations screen shows placeholders
- [ ] Chat screen shows placeholders
- [ ] App doesn't crash
- [ ] Conversations are still functional

## 📱 Expected Debug Output:

### **Console Logs Should Show:**
```
Product data in message service: {
  product_id: "your-product-id",
  product_name: "Original Product Name",
  product_deleted: true,
  isProductDeleted: true,
  productImageUrl: null
}

Product in conversation: {
  id: "your-product-id",
  name: "Original Product Name",
  is_deleted: true,
  productName: "Deleted Item",
  isProductDeleted: true
}
```

### **Database Should Show:**
```sql
-- Product table
id: "your-product-id"
is_deleted: true

-- Conversations table
product_id: "your-product-id"
product_deleted: true
```

## 🚀 Quick Fix Steps:

### **If Nothing Works:**
1. **Run database setup**:
   ```sql
   -- scripts/add-product-deletion-trigger.sql
   ```

2. **Manually test**:
   ```sql
   -- scripts/test-placeholder-manually.sql
   ```

3. **Check console logs** for debug output

4. **Restart the app** and test again

### **If Still Not Working:**
1. **Check network connectivity**
2. **Clear app cache**
3. **Check Supabase connection**
4. **Verify placeholder files exist**

## 📞 Next Steps:

1. **Run the debug script** and share the output
2. **Check console logs** and share any errors
3. **Try manual test** and report results
4. **Share any error messages** you see

This will help identify exactly where the issue is occurring!
