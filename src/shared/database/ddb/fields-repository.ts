import { BaseRepository } from '../repository';
import { FieldEntity, FieldStyle, FieldLayout, FieldAdvanced, FieldValidation, TableConfig } from './entities/field-entity';

/**
 * Fields Repository for DynamoDB
 * Handles CRUD operations for form fields within templates
 */
export class FieldsRepository extends BaseRepository<FieldEntity> {
  protected tableName = `pdf-studio-fields-${process.env['STAGE'] || 'dev'}`;
  protected primaryKey = 'fieldId';

  /**
   * Create a new field with default values
   */
  override async create(fieldData: Omit<FieldEntity, 'fieldId' | 'createdAt' | 'updatedAt'>): Promise<FieldEntity> {
    // Set default values based on field type
    const data = {
      ...fieldData,
      style: fieldData.style || this.getDefaultStyle(fieldData.type),
      layout: fieldData.layout || this.getDefaultLayout(),
      advanced: fieldData.advanced || this.getDefaultAdvanced(fieldData.type),
      validation: fieldData.validation || this.getDefaultValidation(fieldData.type),
    } as Omit<FieldEntity, 'createdAt' | 'updatedAt'>;

    // Add type-specific defaults
    if (fieldData.type === 'separator' && !fieldData.lineProperties) {
      data.lineProperties = {
        thickness: 1,
        opacity: 1,
        style: 'solid',
      };
    }

    if (fieldData.type === 'table' && !fieldData.tableConfig) {
      data.tableConfig = this.getDefaultTableConfig();
    }

    return super.create(data);
  }

  /**
   * Get all fields for a specific template
   */
  async findByTemplateId(
    templateId: string,
    options?: {
      page?: number;
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
    }
  ): Promise<{ items: FieldEntity[]; lastEvaluatedKey?: Record<string, any> }> {
    const queryOptions: any = {
      limit: options?.limit,
      exclusiveStartKey: options?.exclusiveStartKey,
      scanIndexForward: true, // Order by page number
    };

    // If page is specified, filter by page
    if (options?.page !== undefined) {
      queryOptions.sortKeyName = 'page';
      queryOptions.sortKeyValue = options.page;
      queryOptions.sortKeyCondition = '=';
    }

    return this.queryByIndex('TemplateIdIndex', 'templateId', templateId, queryOptions);
  }

  /**
   * Get fields for a specific page of a template
   */
  async findByTemplateIdAndPage(templateId: string, page: number): Promise<FieldEntity[]> {
    const result = await this.queryByIndex('TemplateIdIndex', 'templateId', templateId, {
      sortKeyName: 'page',
      sortKeyValue: page,
      sortKeyCondition: '=',
    });

    return result.items;
  }

  /**
   * Get fields by type
   */
  async findByType(
    fieldType: FieldEntity['type'],
    options?: {
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
    }
  ): Promise<{ items: FieldEntity[]; lastEvaluatedKey?: Record<string, any> }> {
    return this.queryByIndex('TypeIndex', 'type', fieldType, {
      limit: options?.limit,
      exclusiveStartKey: options?.exclusiveStartKey,
      scanIndexForward: false, // Most recent first
    });
  }

  /**
   * Get fields by binding key pattern (useful for data binding)
   */
  async findByBindingKeyPattern(templateId: string, pattern: string): Promise<FieldEntity[]> {
    const allFields = await this.findByTemplateId(templateId);
    const regex = new RegExp(pattern, 'i');
    return allFields.items.filter(field => regex.test(field.bindingKey));
  }

  /**
   * Duplicate a field (useful for copy/paste functionality)
   */
  async duplicate(fieldId: string, newPosition?: FieldEntity['position']): Promise<FieldEntity> {
    const originalField = await this.findById(fieldId);
    if (!originalField) {
      throw new Error(`Field ${fieldId} not found`);
    }

    const duplicatedField = {
      ...originalField,
      name: `${originalField.name} (Copy)`,
      bindingKey: `${originalField.bindingKey}_copy`,
      position: newPosition || {
        x: originalField.position.x + 20,
        y: originalField.position.y + 20,
      },
    };

    // Remove the original fieldId and timestamps to create a new record
    delete (duplicatedField as any).fieldId;
    delete (duplicatedField as any).createdAt;
    delete (duplicatedField as any).updatedAt;

    return this.create(duplicatedField);
  }

  /**
   * Move field to a different page
   */
  async moveToPage(fieldId: string, newPage: number): Promise<FieldEntity> {
    return this.update(fieldId, { page: newPage });
  }

  /**
   * Update field position
   */
  async updatePosition(fieldId: string, position: FieldEntity['position']): Promise<FieldEntity> {
    return this.update(fieldId, { position });
  }

  /**
   * Update field size
   */
  async updateSize(fieldId: string, size: FieldEntity['size']): Promise<FieldEntity> {
    return this.update(fieldId, { size });
  }

  /**
   * Update field style
   */
  async updateStyle(fieldId: string, style: Partial<FieldStyle>): Promise<FieldEntity> {
    const currentField = await this.findById(fieldId);
    if (!currentField) {
      throw new Error(`Field ${fieldId} not found`);
    }

    const updatedStyle = {
      ...currentField.style,
      ...style,
    } as FieldStyle;

    return this.update(fieldId, { style: updatedStyle });
  }

  /**
   * Update field validation
   */
  async updateValidation(fieldId: string, validation: Partial<FieldValidation>): Promise<FieldEntity> {
    const currentField = await this.findById(fieldId);
    if (!currentField) {
      throw new Error(`Field ${fieldId} not found`);
    }

    const updatedValidation = {
      ...currentField.validation,
      ...validation,
    } as FieldValidation;

    return this.update(fieldId, { validation: updatedValidation });
  }

  /**
   * Batch update field positions (useful for drag & drop operations)
   */
  async batchUpdatePositions(updates: Array<{ fieldId: string; position: FieldEntity['position'] }>): Promise<FieldEntity[]> {
    const updatePromises = updates.map(({ fieldId, position }) =>
      this.updatePosition(fieldId, position)
    );

    return Promise.all(updatePromises);
  }

  /**
   * Get field count for a template
   */
  async countByTemplateId(templateId: string): Promise<number> {
    const result = await this.findByTemplateId(templateId);
    return result.items.length;
  }

  /**
   * Get field count by type for a template
   */
  async countByTypeAndTemplateId(templateId: string, fieldType: FieldEntity['type']): Promise<number> {
    const allFields = await this.findByTemplateId(templateId);
    return allFields.items.filter(field => field.type === fieldType).length;
  }

  /**
   * Validate binding key uniqueness within a template
   */
  async isBindingKeyUnique(templateId: string, bindingKey: string, excludeFieldId?: string): Promise<boolean> {
    const allFields = await this.findByTemplateId(templateId);
    const conflictingFields = allFields.items.filter(field =>
      field.bindingKey === bindingKey &&
      field.fieldId !== excludeFieldId
    );

    return conflictingFields.length === 0;
  }

  /**
   * Get fields that overlap with a given area (useful for collision detection)
   */
  async findOverlappingFields(
    templateId: string,
    page: number,
    area: { position: FieldEntity['position']; size: FieldEntity['size'] },
    excludeFieldId?: string
  ): Promise<FieldEntity[]> {
    const pageFields = await this.findByTemplateIdAndPage(templateId, page);

    return pageFields.filter(field => {
      if (field.fieldId === excludeFieldId) return false;

      // Check if rectangles overlap
      const field1 = {
        left: area.position.x,
        right: area.position.x + area.size.width,
        top: area.position.y,
        bottom: area.position.y + area.size.height,
      };

      const field2 = {
        left: field.position.x,
        right: field.position.x + field.size.width,
        top: field.position.y,
        bottom: field.position.y + field.size.height,
      };

      return !(field1.right < field2.left ||
               field2.right < field1.left ||
               field1.bottom < field2.top ||
               field2.bottom < field1.top);
    });
  }

  /**
   * Delete all fields for a template (used when template is deleted)
   */
  async deleteByTemplateId(templateId: string): Promise<void> {
    const fields = await this.findByTemplateId(templateId);

    // Delete fields in batches
    const deletePromises = fields.items.map(field => this.delete(field.fieldId));
    await Promise.all(deletePromises);
  }

  /**
   * Get default style based on field type
   */
  private getDefaultStyle(fieldType: FieldEntity['type']): FieldStyle {
    const baseStyle = {
      fontFamily: 'Arial',
      fontSize: 12,
      textColor: '#000000',
      backgroundColor: 'transparent',
      textAlign: 'left' as const,
      bold: false,
      italic: false,
      underline: false,
      opacity: 1,
    };

    switch (fieldType) {
      case 'separator':
        return {
          ...baseStyle,
          lineThickness: 1,
          lineStyle: 'solid',
          backgroundColor: '#000000',
        };
      case 'label':
        return {
          ...baseStyle,
          bold: true,
          fontSize: 14,
        };
      case 'signature':
        return {
          ...baseStyle,
          backgroundColor: '#F5F5F5',
          textAlign: 'center',
        };
      default:
        return baseStyle;
    }
  }

  /**
   * Get default layout properties
   */
  private getDefaultLayout(): FieldLayout {
    return {
      rotation: 0,
      lockProportions: false,
      layerOrder: 0,
      snapToGrid: true,
    };
  }

  /**
   * Get default advanced properties based on field type
   */
  private getDefaultAdvanced(fieldType: FieldEntity['type']): FieldAdvanced {
    return {
      placeholder: '',
      required: false,
      multiLine: fieldType === 'text',
      maxLength: 255,
      visibility: 'always',
    };
  }

  /**
   * Get default validation based on field type
   */
  private getDefaultValidation(fieldType: FieldEntity['type']): FieldValidation {
    switch (fieldType) {
      case 'email':
        return {
          type: 'email',
          errorMessage: 'Please enter a valid email address',
        };
      default:
        return {
          type: 'none',
        };
    }
  }

  /**
   * Get default table configuration
   */
  private getDefaultTableConfig(): TableConfig {
    return {
      columns: [
        {
          id: 'col1',
          header: 'Column 1',
          dataKey: 'col1',
          width: 'auto',
          align: 'left',
          sortable: false,
          visible: true,
        },
      ],
      showHeader: true,
      showBorders: true,
      showFooter: false,
      borderWidth: 0.5,
      borderColor: '#000000',
      borderStyle: 'solid',
      showHorizontalLines: true,
      showVerticalLines: true,
      horizontalLineStyle: 'solid',
      horizontalLineWidth: 0.5,
      horizontalLineColor: '#000000',
      verticalLineStyle: 'solid',
      verticalLineWidth: 0.5,
      verticalLineColor: '#000000',
      headerHeight: 16,
      rowHeight: 14,
      footerHeight: 16,
      alternateRowColors: false,
      enablePagination: false,
      enableSorting: false,
      tableLayout: 'auto',
      captionPosition: 'top',
      cellPadding: 2,
      cellSpacing: 0,
      frozenColumns: 0,
    };
  }
}

// Export singleton instance
export const fieldsRepository = new FieldsRepository();