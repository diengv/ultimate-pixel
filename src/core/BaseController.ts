import { HttpStatus } from '@nestjs/common';

export class BaseController {
  private shouldIgnoreField(
    fieldName: string,
    ignoreFields: string[],
  ): boolean {
    return ignoreFields.some((pattern) => {
      if (pattern.startsWith('*') && pattern.endsWith('*')) {
        // Pattern like '*field*' - contains matching
        const searchTerm = pattern.slice(1, -1);
        return fieldName.includes(searchTerm);
      } else if (pattern.startsWith('*')) {
        // Pattern like '*field' - contains matching (field anywhere in the name)
        const searchTerm = pattern.slice(1);
        return fieldName.includes(searchTerm);
      } else if (pattern.endsWith('*')) {
        // Pattern like 'field*' - prefix matching
        const prefix = pattern.slice(0, -1);
        return fieldName.startsWith(prefix);
      } else {
        // Exact match
        return fieldName === pattern;
      }
    });
  }

  private filterIgnoredFields(
    data: any,
    ignoreFields: string[],
    whitelist: string[] = [],
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) =>
        this.filterIgnoredFields(item, ignoreFields, whitelist),
      );
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
      const filtered: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (
          !this.shouldIgnoreField(key, ignoreFields) ||
          whitelist.includes(key)
        ) {
          filtered[key] = this.filterIgnoredFields(
            value,
            ignoreFields,
            whitelist,
          );
        }
      }
      return filtered;
    }

    return data;
  }

  responseJson(data: any, status: HttpStatus, message: string = '') {
    const ignoreFields = [
      '*password',
      'password*',
      '*token',
      'created_at',
      'updated_at',
      'deleted_at',
      'dynamicSchema',
    ];

    const whitelist = ['installation_token'];

    const filteredData = this.filterIgnoredFields(
      data,
      ignoreFields,
      whitelist,
    );

    return {
      success: status <= 200,
      message: message,
      data: filteredData,
    };
  }
}
