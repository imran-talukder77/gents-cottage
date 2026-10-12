# Gents Cottage

Static storefront + Firebase (Firestore + Auth). No build step.

## Pages
- `index.html` – landing page (hero, categories, featured, sale, all products, cart, checkout)
- `product-details.html` – product page (gallery, sizes, related products)
- `admin.html` – admin panel (login with your Firebase Auth admin user)

## Admin panel
Dashboard · Products (add / edit / delete / stock / featured, images by path or URL) ·
Categories · Orders (status, call, WhatsApp) · Customers · Store & Landing Page settings.

## One-time setup (required)
1. Firebase Console → **Firestore Database → Rules** → paste `firestore.rules` → **Publish**.
2. Open `/admin.html`, log in, go to **Products** → **Import demo products** (or just Add Product).

No Firebase Storage is used. There is no image upload in the admin panel:
1. Copy the photo into the `image/` folder (e.g. `image/shirt-blue.jpg`) and push to GitHub (Cloudflare redeploys automatically).
2. In Admin -> Products -> Add/Edit, type the path (`image/shirt-blue.jpg`, or just `shirt-blue.jpg`) and press **Add image**.
A full https:// image link also works. Same for the landing page hero image.
Tip: use .jpg/.webp, around 1000px wide, under 150 KB, so the site stays fast.

## Files
`store.js` shared Firebase + data helpers · `admin.js/.css` admin panel ·
`script.js` storefront · `product-details.js` product page · `landing.css` landing styles ·
`products.js` built-in demo products (used until you import / add your own).

## Stock
- Every product has stock **per size** (Admin → Products → Add/Edit). Click a size pill on a product card to change its stock quickly.
- A customer's order reduces stock automatically (checked atomically, so the last piece can't be sold twice).
- A size at 0 is disabled for customers; when every size is 0 the product hides from the website.
- Cancelling an order in the admin puts the stock back.
- Products added before stock tracking are untracked (unlimited) until you edit them and set stock.
