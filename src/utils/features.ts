/**
 * Subscription Plans Feature Access Enforcer
 * Centralizes access controls for Starter, Professional, Premium, and Enterprise subscription tiers.
 */

export const isFeatureEnabled = (restaurant: any, featureKey: string): boolean => {
    if (!restaurant) return false;
    
    const plan = restaurant.planName || "Free Trial";
    
    // Enterprise tier overrides standard limits with granular toggles
    if (plan === "Enterprise") {
        const features = restaurant.enterpriseFeatures || "";
        const enabledList = features.split(",").map((s: string) => s.trim().toLowerCase());
        
        // Custom feature overrides
        if (enabledList.includes(featureKey.toLowerCase())) {
            return true;
        }
        
        // Special case: fallback to standard boolean columns for table ordering and kitchen
        if (featureKey === "ordering") {
            return !!restaurant.isOrderFeatureEnabled;
        }
        if (featureKey === "kitchen") {
            return !!restaurant.isKitchenEnabled;
        }
        
        return false;
    }
    
    // Standard plan tier mapping
    switch (featureKey) {
        // Starter features:
        case "ordering":
            return !!restaurant.isOrderFeatureEnabled;
            
        case "waiterCall":
            return !!restaurant.isOrderFeatureEnabled; // Waiter calling relies on ordering QR codes
            
        // Professional features:
        case "search":
        case "outOfStock":
        case "specials":
        case "analytics":
        case "reviews":
        case "kitchen":
            return plan === "Professional" || plan === "Premium" || plan === "Free Trial";
            
        // Premium features:
        case "loyalty":
        case "banners":
        case "themes":
        case "offers":
            return plan === "Premium" || plan === "Free Trial";
            
        default:
            return false;
    }
};
