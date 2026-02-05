/**
 * In-App Purchases Service
 * Uses cordova-plugin-purchase for StoreKit integration
 * Only active in Adult version (CONFIG.showPaywall === true)
 */

import { CONFIG } from '../config';

// Development mode - set to true to simulate purchases without App Store Connect
// Set to false for production!
const DEV_MODE = true;

// Product IDs (must match App Store Connect)
export const PRODUCT_IDS = {
  dirty: 'com.chatrixllc.guessus.adult.dirty',
  extreme: 'com.chatrixllc.guessus.adult.extreme',
  bundle: 'com.chatrixllc.guessus.adult.bundle',
} as const;

export type ProductId = keyof typeof PRODUCT_IDS;

export interface PurchaseProduct {
  id: ProductId;
  storeId: string;
  price: string;
  title: string;
  description: string;
  owned: boolean;
}

// Store reference (will be initialized on iOS)
let store: any = null;
let isInitialized = false;
let purchaseCallbacks: Map<string, (success: boolean) => void> = new Map();

// Products cache
let products: Map<ProductId, PurchaseProduct> = new Map();

/**
 * Check if running on iOS with StoreKit available
 */
function isStoreAvailable(): boolean {
  return typeof (window as any).CdvPurchase !== 'undefined';
}

/**
 * Initialize the store
 * Call this on app startup
 */
export async function initializePurchases(): Promise<void> {
  // Skip if not Adult version or already initialized
  if (!CONFIG.showPaywall || isInitialized) {
    console.log('Purchases: Skip init (paywall disabled or already initialized)');
    return;
  }

  if (!isStoreAvailable()) {
    console.log('Purchases: Store not available (not on iOS device)');
    return;
  }

  try {
    const CdvPurchase = (window as any).CdvPurchase;
    store = CdvPurchase.store;
    
    // Set verbosity for debugging (remove in production)
    store.verbosity = CdvPurchase.LogLevel.DEBUG;

    // Register products
    store.register([
      {
        id: PRODUCT_IDS.dirty,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.extreme,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.bundle,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
    ]);

    // Handle approved transactions
    store.when().approved((transaction: any) => {
      console.log('Purchase approved:', transaction.products);
      transaction.verify();
    });

    // Handle verified transactions
    store.when().verified((receipt: any) => {
      console.log('Purchase verified:', receipt);
      receipt.finish();
    });

    // Handle finished transactions (purchase complete)
    store.when().finished((transaction: any) => {
      console.log('Purchase finished:', transaction);
      
      transaction.products.forEach((product: any) => {
        const productId = getProductIdFromStoreId(product.id);
        if (productId) {
          // Mark as owned in our cache
          const cached = products.get(productId);
          if (cached) {
            cached.owned = true;
            products.set(productId, cached);
          }
          
          // Call purchase callback if exists
          const callback = purchaseCallbacks.get(product.id);
          if (callback) {
            callback(true);
            purchaseCallbacks.delete(product.id);
          }
        }
      });
    });

    // Handle errors
    store.error((error: any) => {
      console.error('Store error:', error);
      
      // Call all pending callbacks with failure
      purchaseCallbacks.forEach((callback) => {
        callback(false);
      });
      purchaseCallbacks.clear();
    });

    // Initialize the store
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
    
    // Update products cache
    await refreshProducts();
    
    isInitialized = true;
    console.log('Purchases: Initialized successfully');
  } catch (error) {
    console.error('Purchases: Failed to initialize', error);
  }
}

/**
 * Get product ID from store ID
 */
function getProductIdFromStoreId(storeId: string): ProductId | null {
  for (const [key, value] of Object.entries(PRODUCT_IDS)) {
    if (value === storeId) {
      return key as ProductId;
    }
  }
  return null;
}

/**
 * Refresh products from store
 */
async function refreshProducts(): Promise<void> {
  if (!store) return;

  const CdvPurchase = (window as any).CdvPurchase;

  for (const [productId, storeId] of Object.entries(PRODUCT_IDS)) {
    const storeProduct = store.get(storeId, CdvPurchase.Platform.APPLE_APPSTORE);
    
    if (storeProduct) {
      products.set(productId as ProductId, {
        id: productId as ProductId,
        storeId,
        price: storeProduct.pricing?.price || '$?.??',
        title: storeProduct.title || productId,
        description: storeProduct.description || '',
        owned: storeProduct.owned || false,
      });
    } else {
      // Fallback for testing/development
      products.set(productId as ProductId, {
        id: productId as ProductId,
        storeId,
        price: productId === 'bundle' ? '$5.99' : productId === 'extreme' ? '$4.99' : '$2.99',
        title: productId,
        description: '',
        owned: false,
      });
    }
  }
}

/**
 * Get all products with current prices and ownership status
 */
export function getProducts(): PurchaseProduct[] {
  // Return cached products or defaults
  if (products.size === 0) {
    // Return defaults for development/testing
    return [
      { id: 'dirty', storeId: PRODUCT_IDS.dirty, price: '$2.99', title: 'Dirty', description: '', owned: false },
      { id: 'extreme', storeId: PRODUCT_IDS.extreme, price: '$4.99', title: 'Extreme', description: '', owned: false },
      { id: 'bundle', storeId: PRODUCT_IDS.bundle, price: '$5.99', title: 'Bundle', description: '', owned: false },
    ];
  }
  
  return Array.from(products.values());
}

/**
 * Get a specific product
 */
export function getProduct(productId: ProductId): PurchaseProduct | undefined {
  return products.get(productId) || getProducts().find(p => p.id === productId);
}

/**
 * Check if a product is owned
 */
export function isProductOwned(productId: ProductId): boolean {
  const product = products.get(productId);
  return product?.owned || false;
}

/**
 * Purchase a product
 * Returns a promise that resolves to true if purchase was successful
 */
export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const storeId = PRODUCT_IDS[productId];
  
  // Development mode: simulate purchase
  if (DEV_MODE || !store || !isStoreAvailable()) {
    console.log('Purchases: Simulating purchase for', productId, '(DEV_MODE)');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mark as owned in cache
    const product = products.get(productId);
    if (product) {
      product.owned = true;
      products.set(productId, product);
    }
    
    return true;
  }

  return new Promise((resolve) => {
    const CdvPurchase = (window as any).CdvPurchase;
    
    // Store callback for when purchase completes
    purchaseCallbacks.set(storeId, resolve);
    
    // Get the product offer
    const storeProduct = store.get(storeId, CdvPurchase.Platform.APPLE_APPSTORE);
    
    if (!storeProduct) {
      console.error('Product not found:', storeId);
      purchaseCallbacks.delete(storeId);
      resolve(false);
      return;
    }

    // Get the offer to purchase
    const offer = storeProduct.getOffer();
    
    if (!offer) {
      console.error('No offer found for:', storeId);
      purchaseCallbacks.delete(storeId);
      resolve(false);
      return;
    }

    // Start the purchase
    store.order(offer).then((error: any) => {
      if (error) {
        console.error('Order error:', error);
        purchaseCallbacks.delete(storeId);
        resolve(false);
      }
      // Success is handled by the 'finished' callback
    });
  });
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<string[]> {
  if (DEV_MODE || !store || !isStoreAvailable()) {
    console.log('Purchases: Restore simulated (DEV_MODE)');
    // In dev mode, return all owned from cache
    return Array.from(products.values()).filter(p => p.owned).map(p => p.id);
  }

  return new Promise((resolve) => {
    store.restorePurchases().then(() => {
      // Get list of owned products
      const owned: string[] = [];
      
      for (const [productId, storeId] of Object.entries(PRODUCT_IDS)) {
        const CdvPurchase = (window as any).CdvPurchase;
        const product = store.get(storeId, CdvPurchase.Platform.APPLE_APPSTORE);
        
        if (product?.owned) {
          owned.push(productId);
          
          // Update cache
          const cached = products.get(productId as ProductId);
          if (cached) {
            cached.owned = true;
            products.set(productId as ProductId, cached);
          }
        }
      }
      
      resolve(owned);
    }).catch((error: any) => {
      console.error('Restore error:', error);
      resolve([]);
    });
  });
}

/**
 * Get owned categories based on purchased products
 */
export function getOwnedCategoriesFromPurchases(): string[] {
  const owned: string[] = ['party']; // Party is always free
  
  if (isProductOwned('dirty') || isProductOwned('bundle')) {
    owned.push('dirty');
  }
  
  if (isProductOwned('extreme') || isProductOwned('bundle')) {
    owned.push('extreme');
  }
  
  return owned;
}
