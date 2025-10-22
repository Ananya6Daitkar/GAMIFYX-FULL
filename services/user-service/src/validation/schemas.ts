import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 100 characters',
      'any.required': 'Last name is required'
    }),
  
  role: Joi.string()
    .valid('student', 'teacher', 'admin')
    .default('student')
    .messages({
      'any.only': 'Role must be either student, teacher, or admin'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
  avatarUrl: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.uri': 'Avatar URL must be a valid URL'
    }),
  
  bio: Joi.string()
    .max(500)
    .allow(null, '')
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),
  
  githubUsername: Joi.string()
    .alphanum()
    .min(1)
    .max(39)
    .allow(null, '')
    .messages({
      'string.alphanum': 'GitHub username can only contain alphanumeric characters',
      'string.min': 'GitHub username cannot be empty',
      'string.max': 'GitHub username cannot exceed 39 characters'
    }),
  
  preferences: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .messages({
      'object.base': 'Preferences must be an object'
    })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});