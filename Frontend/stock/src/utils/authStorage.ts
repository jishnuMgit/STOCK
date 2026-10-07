const USER_KEY = "PstrUserID";
const TYPE_KEY = "userType";

export const hasStoredUser = () => !!localStorage.getItem(USER_KEY);

export const clearStoredUser = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TYPE_KEY);
};
