"use client";

import { useState } from "react";
import type { AvailableSlot } from "@/types/schedule";

interface ScheduleCalendarProps {
  slots: AvailableSlot[];
  primaryColor: string;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

interface DayInfo {
  date: string;
  day: number;
  isAvailable: boolean;
  isPast: boolean;
  isToday: boolean;
  slots: AvailableSlot[];
}

export default function ScheduleCalendar({
  slots,
  primaryColor,
  onDateSelect,
  selectedDate,
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get days with availability
  const slotsByDate = new Map<string, AvailableSlot[]>();
  for (const slot of slots) {
    const list = slotsByDate.get(slot.date) ?? [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  }

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = (): DayInfo[] => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: DayInfo[] = [];

    // Empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push({
        date: "",
        day: 0,
        isAvailable: false,
        isPast: false,
        isToday: false,
        slots: [],
      });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isPast = dateObj < today;
      const isToday = dateObj.toDateString() === today.toDateString();
      const daySlots = slotsByDate.get(dateStr) ?? [];
      const isAvailable = !isPast && daySlots.length > 0;

      days.push({
        date: dateStr,
        day,
        isAvailable,
        isPast,
        isToday,
        slots: daySlots,
      });
    }

    return days;
  };

  const days = generateCalendarDays();

  const navigateMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    
    // Don't allow navigation to past months
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (newMonth < minDate) {
      return;
    }
    
    setCurrentMonth(newMonth);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()}
          className="p-2 rounded-card hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-card hover:bg-gray-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((dayInfo, index) => (
          <button
            key={index}
            type="button"
            onClick={() => dayInfo.date && dayInfo.isAvailable && onDateSelect(dayInfo.date)}
            disabled={!dayInfo.date || !dayInfo.isAvailable}
            className={`
              aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
              ${!dayInfo.date ? 'invisible' : ''}
              ${dayInfo.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
              ${dayInfo.isToday ? 'ring-2 ring-gray-300' : ''}
              ${dayInfo.isAvailable && !dayInfo.isPast ? 
                `hover:opacity-80 cursor-pointer text-gray-900` : 
                dayInfo.isPast ? 'cursor-not-allowed' : 'cursor-not-allowed'
              }
              ${selectedDate === dayInfo.date ? 'ring-2 ring-offset-2' : ''}
            `}
            style={
              selectedDate === dayInfo.date
                ? {
                    backgroundColor: primaryColor,
                    color: 'white',
                    borderColor: primaryColor,
                  }
                : dayInfo.isAvailable && !dayInfo.isPast
                ? {
                    backgroundColor: '#cccccc',
                  }
                : {}
            }
          >
            {dayInfo.day || ''}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: primaryColor }}
          />
          <span>Data selecionada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200" />
          <span>Indisponíveis</span>
        </div>
      </div>
    </div>
  );
}
