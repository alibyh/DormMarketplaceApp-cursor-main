export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  if (!password) return false;
  return password.length >= 6;
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validateUsername = (username) => {
  if (!username) return false;
  return username.length >= 3;
};

export const validateDormNumber = (dorm) => {
  if (dorm === null || dorm === undefined || dorm === '') return false;
  return dorm.toString().length > 0;
};