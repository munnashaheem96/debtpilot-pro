'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchCollection } from '@/lib/db';
import { Loan, Repayment, SavingsGoal } from '@/types';
import { calculateNextDueDate } from '@/lib/calculators';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CreditCard,
  Coins,
  Target,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  getDay,
} from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'emi' | 'repayment' | 'milestone';
  amount?: number;
  date: string;
  color: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (user) {
      const loadCalendarData = async () => {
        try {
          const lData = await fetchCollection<Loan>('loans', user.uid);
          const rData = await fetchCollection<Repayment>('repayments', user.uid);
          const sData = await fetchCollection<SavingsGoal>('savingsGoals', user.uid);

          setLoans(lData);
          setRepayments(rData);
          setSavings(sData);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadCalendarData();
    }
  }, [user]);

  // Aggregate Events dynamically based on the loaded data
  useEffect(() => {
    const list: CalendarEvent[] = [];

    // 1. Repayment events
    repayments.forEach((r) => {
      list.push({
        id: r.id,
        title: `Repaid ${r.loanName}`,
        type: 'repayment',
        amount: r.amount,
        date: r.date,
        color: 'emerald',
      });
    });

    // 2. Savings milestones targets
    savings.forEach((s) => {
      list.push({
        id: s.id,
        title: `Goal Target: ${s.goalName}`,
        type: 'milestone',
        amount: s.targetAmount,
        date: s.targetDate,
        color: 'indigo',
      });
    });

    // 3. Loan EMI dues (calculate for the current, previous, and next months to display in grid)
    loans.filter(l => l.status === 'Active').forEach((l) => {
      // Calculate due dates in current view scope
      const currentYear = currentMonth.getFullYear();
      const currentMonthIndex = currentMonth.getMonth(); // 0-indexed

      const monthsToCheck = [
        new Date(currentYear, currentMonthIndex - 1, l.dueDate),
        new Date(currentYear, currentMonthIndex, l.dueDate),
        new Date(currentYear, currentMonthIndex + 1, l.dueDate),
      ];

      monthsToCheck.forEach((dateItem, idx) => {
        list.push({
          id: `emi-due-${l.id}-${idx}`,
          title: `EMI due for ${l.loanName}`,
          type: 'emi',
          amount: l.emiAmount,
          date: format(dateItem, 'yyyy-MM-dd'),
          color: 'rose',
        });
      });
    });

    setEvents(list);
  }, [loans, repayments, savings, currentMonth]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Initializing financial calendar...</p>
        </div>
      </Shell>
    );
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar Days Math
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const totalDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate empty spaces before starting date of the month (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);
  const blankDays = Array.from({ length: startDayOfWeek });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dayStr);
  };

  const selectedDateEvents = getEventsForDay(selectedDate);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Calendar</h1>
            <p className="text-sm text-slate-500">Track upcoming EMI dues, recorded payments, and savings milestones.</p>
          </div>
          <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 min-w-28 text-center uppercase tracking-wide">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Layout split with Detail Side panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Table Grid */}
          <div className="lg:col-span-2">
            <Card className="glass-card shadow-premium p-6">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days numbers */}
              <div className="grid grid-cols-7 gap-2">
                {blankDays.map((_, i) => (
                  <div key={`blank-${i}`} className="h-16 md:h-20 bg-slate-50/50 rounded-lg border border-transparent" />
                ))}

                {totalDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={`day-${i}`}
                      onClick={() => setSelectedDate(day)}
                      className={`h-16 md:h-20 p-1.5 rounded-lg border flex flex-col justify-between cursor-pointer transition ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/30'
                          : isToday
                          ? 'border-slate-300 bg-slate-100/30'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isToday ? 'text-brand-500 font-extrabold' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </span>

                      {/* Event dots */}
                      <div className="flex flex-wrap gap-0.5 max-h-6 overflow-hidden">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              e.color === 'rose'
                                ? 'bg-rose-500'
                                : e.color === 'emerald'
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            title={e.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-slate-400 font-bold shrink-0">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Side Dashboard Event list details */}
          <div className="space-y-4">
            <Card className="glass-card shadow-premium p-5 h-full flex flex-col justify-between min-h-64">
              <CardHeader className="p-0 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Ledger for Date
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-700 font-bold mt-0.5">
                    {format(selectedDate, 'do MMMM yyyy')}
                  </CardDescription>
                </div>
                <CalendarIcon className="w-4.5 h-4.5 text-slate-400" />
              </CardHeader>
              <CardContent className="p-0 pt-4 flex-1 overflow-y-auto space-y-3">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-semibold flex flex-col items-center">
                    <Clock className="w-7 h-7 mb-2 text-slate-300" />
                    <span>No financial events scheduled.</span>
                  </div>
                ) : (
                  selectedDateEvents.map((e) => (
                    <div
                      key={e.id}
                      className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                        e.type === 'emi'
                          ? 'border-rose-100 bg-rose-50/50 text-rose-800'
                          : e.type === 'repayment'
                          ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
                          : 'border-indigo-100 bg-indigo-50/50 text-indigo-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {e.type === 'emi' && <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />}
                        {e.type === 'repayment' && <Coins className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {e.type === 'milestone' && <Target className="w-4 h-4 text-indigo-500 shrink-0" />}
                        <span className="truncate max-w-40">{e.title}</span>
                      </div>
                      {e.amount && <span className="font-extrabold ml-2">₹{e.amount.toLocaleString()}</span>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
