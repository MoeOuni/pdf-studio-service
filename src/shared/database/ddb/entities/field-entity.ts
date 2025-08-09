import { 
  BaseEntity, 
  Position, 
  Size, 
  FieldType, 
  TextAlignment, 
  LineStyle, 
  FieldVisibility, 
  ValidationType 
} from './base-entity';

/**
 * Field Style interface
 */
export interface FieldStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  textAlign: TextAlignment;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lineThickness?: number; // For separators
  lineStyle?: LineStyle;
  opacity?: number;
}

/**
 * Field Layout interface
 */
export interface FieldLayout {
  rotation: number;
  lockProportions: boolean;
  layerOrder: number;
  snapToGrid: boolean;
}

/**
 * Field Advanced properties interface
 */
export interface FieldAdvanced {
  placeholder: string;
  required: boolean;
  multiLine: boolean;
  maxLength: number;
  visibility: FieldVisibility;
}

/**
 * Field Validation interface
 */
export interface FieldValidation {
  type: ValidationType;
  regexPattern?: string;
  errorMessage?: string;
  minLength?: number;
  maxLength?: number;
}

/**
 * Line Properties for separator fields
 */
export interface LineProperties {
  thickness: number;
  opacity: number;
  style: LineStyle;
}

/**
 * Table Style interface for table fields
 */
export interface TableStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  padding?: number;
  textAlign?: TextAlignment;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
}

/**
 * Table Column interface
 */
export interface TableColumn {
  id: string;
  header: string;
  dataKey: string;
  width: number | string;
  align: TextAlignment;
  headerStyle?: TableStyle;
  cellStyle?: TableStyle;
  formatter?: string;
  sortable: boolean;
  visible: boolean;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Table Configuration interface
 */
export interface TableConfig {
  columns: TableColumn[];
  showHeader: boolean;
  showBorders: boolean;
  showFooter: boolean;
  borderWidth: number;
  borderColor: string;
  borderStyle: LineStyle;
  showHorizontalLines: boolean;
  showVerticalLines: boolean;
  horizontalLineStyle: LineStyle;
  horizontalLineWidth: number;
  horizontalLineColor: string;
  verticalLineStyle: LineStyle;
  verticalLineWidth: number;
  verticalLineColor: string;
  headerStyle?: TableStyle;
  rowStyle?: TableStyle;
  alternateRowStyle?: TableStyle;
  footerStyle?: TableStyle;
  headerHeight: number;
  rowHeight: number;
  footerHeight: number;
  alternateRowColors: boolean;
  evenRowColor?: string;
  oddRowColor?: string;
  dataPath?: string;
  sampleData?: any[];
  enablePagination: boolean;
  enableSorting: boolean;
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
  tableLayout: 'auto' | 'fixed';
  caption?: string;
  captionPosition: 'top' | 'bottom';
  cellPadding: number;
  cellSpacing: number;
  responsiveBreakpoint?: number;
  maxHeight?: number;
  frozenColumns: number;
}

/**
 * Field entity interface for DynamoDB
 * Represents form fields within templates with all their properties embedded
 */
export interface FieldEntity extends BaseEntity {
  fieldId: string;
  templateId: string;
  name: string;
  type: FieldType;
  page: number;
  position: Position;
  size: Size;
  bindingKey: string;
  value?: string;
  text?: string; // For label fields
  
  // Embedded field properties
  style?: FieldStyle;
  layout?: FieldLayout;
  advanced?: FieldAdvanced;
  validation?: FieldValidation;
  
  // For separator fields
  lineProperties?: LineProperties;
  
  // For table fields
  tableConfig?: TableConfig;
  
  // Additional schema for complex field types
  schema?: Record<string, any>;
}