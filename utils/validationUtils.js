export const validateSignupForm = (formData, t) => {
  const errors = {};

  if (!formData.email?.trim()) {
    errors.email = t('emailRequired');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = t('invalidEmail');
  }

  if (!formData.username?.trim()) {
    errors.username = t('usernameRequired');
  } else if (formData.username.length < 3) {
    errors.username = t('usernameTooShort');
  }

  if (!formData.password?.trim()) {
    errors.password = t('passwordRequired');
  } else if (formData.password.length < 6) {
    errors.password = t('passwordTooShort');
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = t('passwordsDoNotMatch');
  }

  if (!formData.name?.trim()) {
    errors.name = t('nameRequired');
  }

  if (!formData.dormNumber?.trim()) {
    errors.dormNumber = t('dormRequired');
  }

  if (!formData.phoneNumber?.trim()) {
    errors.phoneNumber = t('phoneRequired');
  } else if (!/^\+?[\d\s-]+$/.test(formData.phoneNumber)) {
    errors.phoneNumber = t('invalidPhone');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};