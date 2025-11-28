"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.TransactionType = exports.SyncStatus = exports.CardStatus = exports.OrderStatus = exports.OnboardingStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["DISTRIBUTOR"] = "distributor";
    UserRole["MERCHANT"] = "merchant";
    UserRole["CUSTOMER"] = "customer";
    UserRole["GUEST"] = "guest";
})(UserRole || (exports.UserRole = UserRole = {}));
var OnboardingStatus;
(function (OnboardingStatus) {
    OnboardingStatus["PENDING"] = "pending";
    OnboardingStatus["SUBMITTED"] = "submitted";
    OnboardingStatus["APPROVED"] = "approved";
    OnboardingStatus["REJECTED"] = "rejected";
})(OnboardingStatus || (exports.OnboardingStatus = OnboardingStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["FAILED"] = "failed";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var CardStatus;
(function (CardStatus) {
    CardStatus["ACTIVE"] = "active";
    CardStatus["REDEEMED"] = "redeemed";
    CardStatus["EXPIRED"] = "expired";
    CardStatus["CANCELLED"] = "cancelled";
})(CardStatus || (exports.CardStatus = CardStatus = {}));
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["OUT_OF_SYNC"] = "out_of_sync";
    SyncStatus["ERROR"] = "error";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["TOPUP"] = "topup";
    TransactionType["DEBIT"] = "debit";
    TransactionType["REFUND"] = "refund";
    TransactionType["ADJUSTMENT"] = "adjustment";
    TransactionType["RESERVE"] = "reserve";
    TransactionType["RELEASE"] = "release";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SUCCESS"] = "success";
    NotificationType["ERROR"] = "error";
    NotificationType["WARNING"] = "warning";
    NotificationType["INFO"] = "info";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=database.js.map