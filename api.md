# Buzzer Backend API Endpoints

Below is the list of all API endpoints and the files where they are defined:

## admin.py
- **[PATCH]** /users/<int:user_id>/approve
- **[PATCH]** /users/<int:user_id>/verify
- **[PATCH]** /shops/<int:shop_id>/approve
- **[POST]** /wallet/topup
- **[GET]** /shops/<int:shop_id>/response-stats
- **[GET]** /users
- **[GET]** /active-stats
- **[GET]** /shops
- **[POST]** /create-admin
- **[POST]** /users/<int:user_id>/restore
- **[GET]** /users/<int:user_id>
- **[PATCH]** /users/<int:user_id>
- **[DELETE]** /users/<int:user_id>
- **[POST]** /users/<int:user_id>/notify
- **[POST]** /notify/broadcast
- **[PATCH]** /users/<int:user_id>/suspend
- **[GET]** /delivery-partners/<int:partner_id>/complaints
- **[GET]** /audit-logs
- **[GET]** /orders
- **[POST]** /orders/<int:order_id>/complaints
- **[PATCH]** /complaints/<int:complaint_id>/resolve
- **[GET]** /complaints
- **[GET]** /transactions
- **[GET]** /orders/stuck
- **[POST]** /orders/<int:order_id>/mark-absconded
- **[POST]** /users/<int:user_id>/settle-cod
- **[POST]** /orders/<int:order_id>/refund-buyer
- **[POST]** /orders/<int:order_id>/compensate-seller
- **[POST]** /orders/<int:order_id>/assign-delivery
- **[POST]** /orders/<int:order_id>/force-cancel
- **[GET]** /items
- **[POST]** /items
- **[GET]** /item-requests
- **[POST]** /item-requests/<int:req_id>/<action>
- **[GET]** /items/<int:item_id>/shops
- **[DELETE]** /products/<int:product_id>
- **[GET]** /withdrawals
- **[PATCH]** /withdrawals/<int:req_id>
- **[GET]** /recycle-bin/users
- **[GET]** /recycle-bin/products
- **[POST]** /recycle-bin/products/<int:product_id>/restore
- **[GET, POST]** /delivery-settings
- **[GET]** /offers
- **[GET]** /analytics
- **[POST]** /catalog/<int:item_id>/image
- **[GET, PATCH]** /platform-settings
- **[POST]** /upload-image
- **[PATCH]** /items/<int:item_id>
- **[DELETE]** /items/<int:item_id>/image
- **[DELETE]** /items/<int:item_id>
- **[GET]** /recycle-bin/items
- **[POST]** /recycle-bin/items/<int:item_id>/restore
- **[DELETE]** /recycle-bin/items/<int:item_id>/hard-delete
- **[POST]** /items/<int:item_id>/hide-image
- **[POST]** /items/<int:item_id>/restore-image

## auth.py
- **[POST]** /auth/logout
- **[POST]** /auth/verify-otp
- **[POST]** /send-otp
- **[POST]** /forgot-password/send-otp
- **[POST]** /forgot-password/reset
- **[POST]** /register
- **[POST]** /login
- **[GET]** /me
- **[GET]** /config
- **[POST]** /google
- **[POST]** /google/complete-signup
- **[GET]** /platform-config

## communications.py
- **[POST]** /send-sms
- **[POST]** /send-email

## delivery.py
- **[PATCH]** /status
- **[POST]** /orders/<int:order_id>/drop
- **[GET]** /stats
- **[GET]** /available-orders
- **[POST]** /orders/<int:order_id>/accept
- **[POST]** /orders/<int:order_id>/confirm-pickup
- **[PATCH]** /orders/<int:order_id>/delivered
- **[PATCH]** /orders/<int:order_id>/attempt-failed
- **[POST]** /orders/<int:order_id>/return-to-shop
- **[GET]** /orders
- **[GET]** /wallet
- **[POST]** /location
- **[POST]** /wallet/settle

## seller.py
- **[PATCH]** /status
- **[POST]** /shop
- **[GET]** /shop
- **[PATCH]** /shop/settings
- **[GET]** /shop/trusted-partners
- **[POST]** /shop/trusted-partners
- **[DELETE]** /shop/trusted-partners/<int:partner_id>
- **[POST]** /products
- **[GET]** /products
- **[PATCH]** /products/<int:product_id>
- **[DELETE]** /products/<int:product_id>
- **[GET]** /orders
- **[PATCH]** /orders/<int:order_id>/confirm-all
- **[PATCH]** /orders/<int:order_id>/mark-unavailable
- **[PATCH]** /orders/<int:order_id>/ready
- **[PATCH]** /orders/<int:order_id>/self-deliver-status
- **[GET]** /wallet
- **[GET]** /global-items
- **[POST]** /item-requests
- **[GET]** /stats
- **[PATCH]** /shop/toggle-self-delivery
- **[POST]** /orders/<int:order_id>/partial-accept
- **[POST]** /orders/<int:order_id>/claim-payment
- **[PATCH]** /products/<int:product_id>/toggle-stock
- **[GET, POST]** /offers
- **[PATCH]** /offers/<int:offer_id>
- **[DELETE]** /offers/<int:offer_id>
- **[POST]** /orders/<int:order_id>/approve-shortage

## shop_browse.py
- **[GET]** /shops
- **[GET]** /shops/<int:shop_id>/products
- **[GET]** /grocery/categories
- **[GET]** /grocery/aggregated-products
- **[GET]** /grocery/aggregated-products/<int:global_item_id>/shops
- **[GET]** /search/suggestions
- **[GET]** /search

## user.py
- **[GET]** /user/profile
- **[PATCH]** /user/profile
- **[POST]** /user/wallet/add-money
- **[PATCH]** /user/location
- **[POST]** /orders
- **[GET]** /orders
- **[POST]** /orders/<int:order_id>/cancel
- **[POST]** /orders/<int:order_id>/buyer-decision
- **[POST]** /orders/<int:order_id>/complaint
- **[GET]** /notifications
- **[PATCH]** /notifications/<int:notif_id>/read
- **[POST]** /orders/<int:order_id>/confirm-partial
- **[POST]** /orders/<int:order_id>/reject-partial
- **[POST]** /wallet/withdraw
- **[POST]** /orders/<int:order_id>/rate
- **[GET]** /wishlist
- **[POST]** /wishlist/<int:product_id>
- **[PATCH]** /notifications/read-all
- **[GET]** /notifications/unread-count
- **[GET]** /orders/<int:order_id>/tracking
- **[POST]** /wallet/topup
- **[POST]** /orders/<int:order_id>/confirm-self-delivery

