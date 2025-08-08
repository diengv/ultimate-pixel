import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from './i18n.service';

interface StandardResponse {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

@Injectable()
export class I18nInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request: any = ctx.getRequest();
    const headerLocale = request?.headers?.['x-locale'] as string;
    const locale = this.i18n.getLocaleFromHeader(headerLocale || 'vi');

    return next.handle().pipe(
      map((response: any) => {
        // Only process standard object responses
        if (response && typeof response === 'object') {
          const resp = response as StandardResponse;
          if (typeof resp.message === 'string' && resp.message.length > 0) {
            // Translate message if we have a dictionary entry; otherwise leave as-is
            const translated = this.i18n.t(resp.message, locale);
            if (translated) {
              resp.message = translated;
            }
          }
        }

        return response;
      }),
    );
  }
}
