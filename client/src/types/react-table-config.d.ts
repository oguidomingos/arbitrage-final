import {
  UseTableColumnProps,
  UseSortByColumnProps,
} from 'react-table';

declare module 'react-table' {
  export interface TableState<D extends object = {}> {
    sortBy: Array<{
      id: string;
      desc: boolean;
    }>;
  }

  export interface ColumnInterface<D extends object = {}> {
    Header: string;
    accessor?: keyof D | ((row: D) => any);
    id?: string;
    Cell?: ({ value }: { value: any }) => JSX.Element;
    sortType?: string;
    canSort?: boolean;
    isVisible?: boolean;
    render?: any;
    totalLeft?: number;
    totalWidth?: number;
  }

  export interface UseTableColumnOptions<D extends object = {}>
    extends UseTableColumnProps<D>,
      UseSortByColumnProps<D> {
    sortType?: string;
    canSort?: boolean;
  }

  export interface Column<D extends object = {}>
    extends UseTableColumnOptions<D> {
    sortType?: string;
    canSort?: boolean;
  }
}