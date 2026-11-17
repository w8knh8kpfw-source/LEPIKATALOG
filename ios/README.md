# LEPÍ iOS

Native SwiftUI storefront for LEPÍ (Khujand, Tajikistan).

## Included in v1
- Home, catalog and cart tabs
- Responsive adaptive product grid for iPhone and iPad
- Search and category filters
- Product detail sheet and live stock labels
- Persistent cart using UserDefaults
- Checkout with privacy acknowledgement
- Existing Render API integration:
  - GET https://lepi-orders.onrender.com/api/product-statuses
  - POST https://lepi-orders.onrender.com/api/order
- Product images loaded from the existing public LEPIKATALOG repository

## Open
Open `LEPI.xcodeproj` in Xcode, select the LEPI scheme and an iOS 16+ simulator/device, then Run.

## Backend and security
The app uses the existing public storefront API. Supabase service-role credentials and Telegram bot credentials are never included in the iOS bundle. Prices are recalculated by the server. Checkout requires the privacy acknowledgement in the app and validates required contact fields before sending.

## Notes
- Bundle identifier: `com.lepi.ios`
- Minimum deployment target: iOS 16.0
- No third-party packages required.
- The app uses the current server-side product IDs and order payload contract.
