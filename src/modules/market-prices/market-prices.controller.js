const MarketPrice = require('./market-price.model');
const { sendSuccess, sendError } = require('../../utils/response');

const getMarketPrices = async (req, res) => {
  try {
    const { category, region, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (region) filter.region = region;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { productName: { $regex: escaped, $options: 'i' } },
        { province: { $regex: escaped, $options: 'i' } },
      ];
    }

    const items = await MarketPrice.find(filter)
      .sort({ recordedAt: -1, productName: 1 })
      .lean();
    const categories = await MarketPrice.distinct('category');
    const regions = await MarketPrice.distinct('region');

    return sendSuccess(res, {
      items,
      categories: categories.sort(),
      regions: regions.sort(),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

module.exports = { getMarketPrices };
