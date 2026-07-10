const { sendSuccess, sendError } = require('../../utils/response');

const PROVINCES = [
  { id: '1', name: 'Lâm Đồng' },
  { id: '2', name: 'Hà Nội' },
  { id: '3', name: 'TP. Hồ Chí Minh' },
  { id: '4', name: 'Cần Thơ' },
  { id: '5', name: 'Đắk Lắk' }
];

const DISTRICTS = {
  '1': [ // Lâm Đồng
    { id: '11', name: 'Đà Lạt', provinceId: '1' },
    { id: '12', name: 'Đức Trọng', provinceId: '1' },
    { id: '13', name: 'Bảo Lộc', provinceId: '1' },
    { id: '14', name: 'Đơn Dương', provinceId: '1' }
  ],
  '2': [ // Hà Nội
    { id: '21', name: 'Cầu Giấy', provinceId: '2' },
    { id: '22', name: 'Đống Đa', provinceId: '2' },
    { id: '23', name: 'Ba Đình', provinceId: '2' }
  ],
  '3': [ // TP. Hồ Chí Minh
    { id: '31', name: 'Quận 1', provinceId: '3' },
    { id: '32', name: 'Quận 3', provinceId: '3' },
    { id: '33', name: 'Thủ Đức', provinceId: '3' }
  ],
  '4': [ // Cần Thơ
    { id: '41', name: 'Ninh Kiều', provinceId: '4' },
    { id: '42', name: 'Cái Răng', provinceId: '4' }
  ],
  '5': [ // Đắk Lắk
    { id: '51', name: 'Buôn Ma Thuột', provinceId: '5' },
    { id: '52', name: 'Krông Pắc', provinceId: '5' }
  ]
};

const getProvinces = async (req, res) => {
  try {
    return sendSuccess(res, PROVINCES, 'Get provinces successfully');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const getDistricts = async (req, res) => {
  try {
    const { provinceId } = req.query;
    if (!provinceId) {
      const allDistricts = Object.values(DISTRICTS).flat();
      return sendSuccess(res, allDistricts, 'Get all districts successfully');
    }
    const districts = DISTRICTS[provinceId] || [];
    return sendSuccess(res, districts, 'Get districts successfully');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { getProvinces, getDistricts };
