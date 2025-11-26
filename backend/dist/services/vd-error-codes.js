"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VD_ERROR_CODES = void 0;
exports.getVDErrorMessage = getVDErrorMessage;
exports.VD_ERROR_CODES = {
    0: 'APPROVAL',
    100: 'Store ID not found',
    500: 'Argument is invalid',
    7002: 'SKU not Assigned',
    711: 'The Brand does not exist',
    9019: 'ReqId is mandatory',
    9020: 'ReqId already exist, please send unique ReqId',
    9006: 'Unsupported Request',
    9002: 'Incorrect User ID or Password',
    9001: 'Incorrect Parameter',
    8028: 'Exceed Max. Number of Cards',
    8025: 'Cannot Decrypt String',
    8024: 'Cannot Encrypt String',
    8017: 'Incorrect Distributor Id',
    7001: 'Timeout',
    7003: 'Duplicate Receipt Number',
    7004: 'Duplicate Order ID',
    7005: 'Please check your no of card request',
    1101: 'IP Address Not Whitelisted',
    1102: 'Invalid Token',
    1103: 'Incorrect Distributor Id',
    1104: 'Expired Token',
    1105: 'Invalid Request',
    1106: 'Your order status is processing, Please check status after sometime',
    1107: 'Order quantity should not be greater than allowed',
    700: 'Order Id no matching',
    701: 'Pending',
    610: 'Mobile Number is Blank',
    608: 'Access Key or Receipt Number Is Mismatch',
    606: 'Receipt Number Is Not Unique',
    604: 'Receipt Number is Blank',
    603: 'Card Pool Empty To Assign',
    503: 'The payment amount exceeds balance',
    383: 'Invalid Amount specified',
    380: 'Duplicate Transaction',
    329: 'Amount not same as Prevalued Amount',
    384: 'Invalid or Mismatched Currency Used in Request',
    16: 'Insufficient Funds',
    '-1': 'Please Check Card Pools',
};
function getVDErrorMessage(code) {
    if (code === undefined || code === null)
        return 'Unknown error';
    return exports.VD_ERROR_CODES[code] || `Unknown error code: ${code}`;
}
//# sourceMappingURL=vd-error-codes.js.map