'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export default function ChartView({ data, columns }) {
  if (!data || data.length === 0) return null;

  // Get numeric columns for charting
  const numericColumns = columns.filter(col => {
    return data.some(row => typeof row[col] === 'number' || !isNaN(Number(row[col])));
  });

  // Get categorical columns
  const categoricalColumns = columns.filter(col => {
    return data.some(row => typeof row[col] === 'string' || isNaN(Number(row[col])));
  });

  if (numericColumns.length === 0) {
    return (
      <div className="text-center py-8 text-purple-300">
        No numeric data available for visualization
      </div>
    );
  }

  // Prepare data for charts
  const chartData = data.slice(0, 50).map((row, idx) => {
    const item = { index: idx + 1 };
    columns.forEach(col => {
      const value = row[col];
      item[col] = isNaN(Number(value)) ? value : Number(value);
    });
    return item;
  });

  // Aggregate data for pie chart (count by category)
  const getPieData = () => {
    if (categoricalColumns.length === 0) return [];
    const firstCat = categoricalColumns[0];
    const counts = {};
    data.forEach(row => {
      const val = String(row[firstCat] || 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).slice(0, 8).map(([name, value]) => ({ name, value }));
  };

  const pieData = getPieData();

  return (
    <div className="space-y-8">
      {/* Bar Chart */}
      {numericColumns.length > 0 && (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4">📊 Bar Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="index" stroke="#c4b5fd" />
              <YAxis stroke="#c4b5fd" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #6366f1', borderRadius: '8px' }}
                labelStyle={{ color: '#c4b5fd' }}
              />
              <Legend wrapperStyle={{ color: '#c4b5fd' }} />
              {numericColumns.slice(0, 3).map((col, idx) => (
                <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Line Chart */}
      {numericColumns.length > 0 && (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4">📈 Line Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="index" stroke="#c4b5fd" />
              <YAxis stroke="#c4b5fd" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #6366f1', borderRadius: '8px' }}
                labelStyle={{ color: '#c4b5fd' }}
              />
              <Legend wrapperStyle={{ color: '#c4b5fd' }} />
              {numericColumns.slice(0, 3).map((col, idx) => (
                <Line key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4">🥧 Distribution - {categoricalColumns[0]}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #6366f1', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
