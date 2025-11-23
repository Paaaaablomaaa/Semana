import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Task, DAYS_ORDER } from '../types';

interface StatsChartProps {
  tasks: Task[];
}

const StatsChart: React.FC<StatsChartProps> = ({ tasks }) => {
  const data = useMemo(() => {
    return DAYS_ORDER.map(day => {
      const dayTasks = tasks.filter(t => t.day === day && !t.isCompleted);
      const completedTasks = tasks.filter(t => t.day === day && t.isCompleted);
      
      return {
        name: day.substring(0, 3),
        fullDay: day,
        active: dayTasks.length,
        completed: completedTasks.length,
        total: dayTasks.length + completedTasks.length
      };
    });
  }, [tasks]);

  return (
    <div className="h-full w-full bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-slate-800 text-lg font-bold">Productividad Semanal</h3>
          <p className="text-slate-500 text-xs">Tareas activas vs completadas</p>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={12}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9', radius: 6 }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                fontFamily: 'Outfit, sans-serif'
              }}
            />
            <Bar dataKey="active" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
            <Bar dataKey="completed" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;