/**
 * Sends the product image to the enhancement module.
 */
export async function enhanceProductImage(imageFile) {
  if (!imageFile) {
    throw new Error("A product image is required.");
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch("/api/enhance-image", {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "Image enhancement failed."
    );
  }

  return result;
}


/**
 * Sends product information to the price-prediction module.
 */
export async function getPredictedPrice({
  category,
  material,
  size
}) {
  if (!category || !material || !size) {
    throw new Error(
      "Category, material and size are required."
    );
  }

  const response = await fetch("/api/predict-price", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      category,
      material,
      size
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "Price prediction failed."
    );
  }

  return result;
}
/**
 * Creates a Product object using the exact keys from the
 * integration contract.
 */
export function createProductObject({
  artisanId,
  title,
  description,
  material,
  category,
  rawImageUrl,
  enhancedImageUrl,
  predictedPrice,
  language
}) {
  return {
    product_id: crypto.randomUUID(),
    artisan_id: artisanId,
    title: title.trim(),
    description: description.trim(),
    material: material.trim(),
    category: category.trim(),
    raw_image_url: rawImageUrl || "",
    enhanced_image_url: enhancedImageUrl || "",
    predicted_price: Number(predictedPrice),
    language: language || "hi",
    status: "draft",
    created_at: new Date().toISOString()
  };
}
/**
 * Checks whether a product is ready for B2B listing.
 */
export function validateProduct(product) {
  const requiredFields = [
    "product_id",
    "artisan_id",
    "title",
    "description",
    "material",
    "category",
    "raw_image_url",
    "enhanced_image_url",
    "predicted_price",
    "language",
    "status",
    "created_at"
  ];

  const missingFields = requiredFields.filter(
    (field) => {
      const value = product[field];

      return (
        value === undefined ||
        value === null ||
        value === ""
      );
    }
  );

  const validStatuses = [
    "draft",
    "listed",
    "synced"
  ];

  const errors = [];

  if (missingFields.length > 0) {
    errors.push(
      `Missing fields: ${missingFields.join(", ")}`
    );
  }

  if (
    Number.isNaN(product.predicted_price) ||
    product.predicted_price <= 0
  ) {
    errors.push(
      "Predicted price must be a positive number."
    );
  }

  if (!validStatuses.includes(product.status)) {
    errors.push("Invalid product status.");
  }

  return {
    valid: errors.length === 0,
    missing_fields: missingFields,
    errors
  };
}
/**
 * Changes a valid draft product into a listed product.
 */
export function prepareB2BListing(product) {
  const validation = validateProduct(product);

  if (!validation.valid) {
    return {
      success: false,
      product,
      errors: validation.errors
    };
  }

  return {
    success: true,
    product: {
      ...product,
      status: "listed"
    }
  };
}
/**
 * Creates a marketplace listing without changing the
 * agreed Product object structure.
 */
export function createMarketplaceListing(
  product,
  listingAnswers
) {
  const productValidation = validateProduct(product);

  if (!productValidation.valid) {
    return {
      success: false,
      errors: productValidation.errors
    };
  }

  const listingDetails = {
    marketplace_channel:
      listingAnswers.marketplace_channel,

    seller_id:
      listingAnswers.seller_id,

    stock_quantity: Number(
      listingAnswers.stock_quantity
    ),

    sku:
      listingAnswers.sku ||
      generateSKU(product.product_id),

    size:
      listingAnswers.size,

    length_cm: Number(
      listingAnswers.length_cm
    ),

    width_cm: Number(
      listingAnswers.width_cm
    ),

    height_cm: Number(
      listingAnswers.height_cm
    ),

    weight_grams: Number(
      listingAnswers.weight_grams
    ),

    making_time_days: Number(
      listingAnswers.making_time_days
    ),

    made_to_order:
      normalizeListingBoolean(
        listingAnswers.made_to_order
      ),

    shipping_available:
      normalizeListingBoolean(
        listingAnswers.shipping_available
      ),

    listing_information_confirmed:
      normalizeListingBoolean(
        listingAnswers.listing_information_confirmed
      ),

    channel_terms_accepted:
      normalizeListingBoolean(
        listingAnswers.channel_terms_accepted
      ),

    listing_submission_status:
      "prototype_not_submitted"
  };

  const listing = {
    listing_id: crypto.randomUUID(),
    marketplace_channel:
      listingDetails.marketplace_channel,

    product: {
      ...product,
      status: "listed"
    },

    listing_details: listingDetails,

    created_at: new Date().toISOString()
  };

  const listingValidation =
    validateMarketplaceListing(listing);

  return {
    success: listingValidation.valid,
    listing,
    errors: listingValidation.errors
  };
}


/**
 * Generates a short SKU using the Product ID.
 */
function generateSKU(productId) {
  const shortId = String(productId)
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `ART-${shortId}`;
}


/**
 * Normalizes boolean values received from typed or
 * voice-assisted form input.
 */
function normalizeListingBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase();

  const positiveValues = [
    "true",
    "yes",
    "haan",
    "हाँ",
    "हां"
  ];

  const negativeValues = [
    "false",
    "no",
    "nahi",
    "नहीं",
    "नही"
  ];

  if (positiveValues.includes(normalizedValue)) {
    return true;
  }

  if (negativeValues.includes(normalizedValue)) {
    return false;
  }

  return null;
}


/**
 * Validates marketplace-specific listing information.
 */
export function validateMarketplaceListing(listing) {
  const errors = [];

  if (!listing || !listing.product) {
    return {
      valid: false,
      errors: ["Product information is missing."]
    };
  }

  const details = listing.listing_details;

  if (!details) {
    return {
      valid: false,
      errors: ["Listing details are missing."]
    };
  }

  const supportedChannels = [
    "internal_b2b",
    "amazon_karigar",
    "flipkart_samarth",
    "ondc"
  ];

  if (
    !supportedChannels.includes(
      details.marketplace_channel
    )
  ) {
    errors.push(
      "Select a supported marketplace channel."
    );
  }

  if (!details.seller_id) {
    errors.push("Seller ID is required.");
  }

  if (
    Number.isNaN(details.stock_quantity) ||
    details.stock_quantity < 1
  ) {
    errors.push(
      "Stock quantity must be at least one."
    );
  }

  if (!details.size) {
    errors.push("Product size is required.");
  }

  const measurementFields = [
    "length_cm",
    "width_cm",
    "height_cm",
    "weight_grams"
  ];

  measurementFields.forEach((field) => {
    if (
      Number.isNaN(details[field]) ||
      details[field] <= 0
    ) {
      errors.push(
        `${field} must be greater than zero.`
      );
    }
  });

  if (
    Number.isNaN(details.making_time_days) ||
    details.making_time_days < 0
  ) {
    errors.push(
      "Making time cannot be negative."
    );
  }

  if (
    details.made_to_order === null ||
    details.shipping_available === null
  ) {
    errors.push(
      "Order and shipping options are required."
    );
  }

  if (
    details.listing_information_confirmed !== true
  ) {
    errors.push(
      "Product information must be confirmed."
    );
  }

  if (
    details.channel_terms_accepted !== true
  ) {
    errors.push(
      "Marketplace terms must be accepted."
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
/**
 * Calls the image-enhancement and price-prediction
 * endpoints, then creates the final Product object.
 */
export async function createProcessedProduct({
  artisanId,
  title,
  description,
  material,
  category,
  size,
  rawImageUrl,
  imageFile,
  language
}) {
  if (!imageFile) {
    throw new Error(
      "A product image is required."
    );
  }

  const [
    imageResult,
    priceResult
  ] = await Promise.all([
    enhanceProductImage(imageFile),

    getPredictedPrice({
      category,
      material,
      size
    })
  ]);

  const product = createProductObject({
    artisanId,
    title,
    description,
    material,
    category,
    rawImageUrl,

    enhancedImageUrl:
      imageResult.enhanced_image_url,

    predictedPrice:
      priceResult.predicted_price,

    language
  });

  return {
    product,

    price_range:
      priceResult.price_range,

    additional_scenes:
      imageResult.additional_scenes || {}
  };
}
export async function createProductWithFallback({
  artisanId,
  title,
  description,
  material,
  category,
  size,
  rawImageUrl,
  imageFile,
  manualPrice,
  language
}) {
  let enhancedImageUrl = rawImageUrl;
  let predictedPrice = manualPrice;
  let priceRange = [];
  let additionalScenes = {};

  try {
    const imageResult =
      await enhanceProductImage(imageFile);

    enhancedImageUrl =
      imageResult.enhanced_image_url;

    additionalScenes =
      imageResult.additional_scenes || {};
  } catch (error) {
    console.warn(
      "Using the original image:",
      error.message
    );
  }

  try {
    const priceResult =
      await getPredictedPrice({
        category,
        material,
        size
      });

    predictedPrice =
      priceResult.predicted_price;

    priceRange =
      priceResult.price_range;
  } catch (error) {
    console.warn(
      "Using the manually entered price:",
      error.message
    );
  }

  const product = createProductObject({
    artisanId,
    title,
    description,
    material,
    category,
    rawImageUrl,
    enhancedImageUrl,
    predictedPrice,
    language
  });

  return {
    product,
    price_range: priceRange,
    additional_scenes: additionalScenes
  };
}