import { Injectable } from '@nestjs/common';

export type Locale = 'en' | 'vi';

@Injectable()
export class I18nService {
  // Minimal in-memory dictionaries. Keys can be either structured keys or raw English messages.
  private dictionaries: Record<Locale, Record<string, string>> = {
    en: {
      // Keys
      'installation.started': 'Installation started successfully',
      'authorization.success': 'Authorization successful',
      'error.installation.internal': 'Internal server error during installation',
      'error.authorization.internal': 'Internal server error during authorization',
      'error.request.too_old': 'Request timestamp is too old',
      'error.hmac.invalid': 'Invalid HMAC signature',
      'error.shop_code.required': 'Shop code is required',
      // Raw message mapping (so we don\'t have to change controllers immediately)
      'Installation started successfully': 'Installation started successfully',
      'Authorization successful': 'Authorization successful',
      'Internal server error during installation': 'Internal server error during installation',
      'Internal server error during authorization': 'Internal server error during authorization',
      'Request timestamp is too old': 'Request timestamp is too old',
      'Invalid HMAC signature': 'Invalid HMAC signature',
      'Shop code is required': 'Shop code is required',
    },
    vi: {
      // Keys
      'installation.started': 'Bắt đầu cài đặt thành công',
      'authorization.success': 'Ủy quyền thành công',
      'error.installation.internal': 'Lỗi máy chủ nội bộ trong quá trình cài đặt',
      'error.authorization.internal': 'Lỗi máy chủ nội bộ trong quá trình ủy quyền',
      'error.request.too_old': 'Dấu thời gian của yêu cầu đã quá cũ',
      'error.hmac.invalid': 'Chữ ký HMAC không hợp lệ',
      'error.shop_code.required': 'Mã cửa hàng là bắt buộc',
      // Raw message mapping
      'Installation started successfully': 'Bắt đầu cài đặt thành công',
      'Authorization successful': 'Ủy quyền thành công',
      'Internal server error during installation': 'Lỗi máy chủ nội bộ trong quá trình cài đặt',
      'Internal server error during authorization': 'Lỗi máy chủ nội bộ trong quá trình ủy quyền',
      'Request timestamp is too old': 'Dấu thời gian của yêu cầu đã quá cũ',
      'Invalid HMAC signature': 'Chữ ký HMAC không hợp lệ',
      'Shop code is required': 'Mã cửa hàng là bắt buộc',
    },
  };

  getLocaleFromHeader(headerValue?: string): Locale {
    const lc = (headerValue || '').toLowerCase().trim();
    if (lc.startsWith('vi')) return 'vi';
    return 'en';
  }

  t(key: string, locale: Locale): string {
    const dict = this.dictionaries[locale] || {};
    if (dict[key]) return dict[key];
    // Fallback to English if available
    const fallback = this.dictionaries.en[key];
    return fallback || key;
  }
}
