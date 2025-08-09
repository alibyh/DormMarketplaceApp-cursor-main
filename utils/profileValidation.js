export const validateProfileForm = (formData, t) => {
  const errors = {};

  if (!formData.name?.trim()) {
    errors.name = t('nameRequired');
  }

  if (!formData.username?.trim()) {
    errors.username = t('usernameRequired');
  } else if (formData.username.length < 3) {
    errors.username = t('usernameTooShort');
  }

  if (formData.phoneNumber && !/^\+?[\d\s-]+$/.test(formData.phoneNumber)) {
    errors.phoneNumber = t('invalidPhoneNumber');
  }

  if (formData.password && formData.password.length < 6) {
    errors.password = t('passwordTooShort');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};