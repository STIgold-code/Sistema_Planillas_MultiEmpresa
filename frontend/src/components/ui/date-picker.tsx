'use client';

import * as React from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  /** Año más antiguo a mostrar en el selector (default: 2000) */
  fromYear?: number;
  /** Año más reciente a mostrar en el selector (default: año actual + 10) */
  toYear?: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function DatePicker({
  date,
  onSelect,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  minDate,
  maxDate,
  className,
  fromYear = 2000,
  toYear = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(date || new Date());

  // Actualizar viewDate cuando cambie date
  React.useEffect(() => {
    if (date) {
      setViewDate(date);
    }
  }, [date]);

  const years = React.useMemo(() => {
    const result = [];
    for (let y = toYear; y >= fromYear; y--) {
      result.push(y);
    }
    return result;
  }, [fromYear, toYear]);

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(viewDate, parseInt(month));
    setViewDate(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(viewDate, parseInt(year));
    setViewDate(newDate);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd MMM yyyy', { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Header con selectores de mes y año */}
        <div className="flex items-center justify-between gap-1 p-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            <Select
              value={viewDate.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()} className="text-xs">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={viewDate.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-xs">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          mode="single"
          selected={date}
          month={viewDate}
          onMonthChange={setViewDate}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          classNames={{
            month_caption: 'hidden',
            nav: 'hidden',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate,
  maxDate,
  disabled = false,
}: DateRangePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <DatePicker
          date={startDate}
          onSelect={onStartDateChange}
          placeholder="Fecha inicio"
          disabled={disabled}
          minDate={minDate}
          maxDate={endDate || maxDate}
        />
      </div>
      <div className="space-y-2">
        <DatePicker
          date={endDate}
          onSelect={onEndDateChange}
          placeholder="Fecha fin"
          disabled={disabled}
          minDate={startDate || minDate}
          maxDate={maxDate}
        />
      </div>
    </div>
  );
}
