import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText, Calendar, Clock, DollarSign, Truck, TrendingUp,
  Users, Download, BarChart3, CheckCircle2, AlertTriangle, Timer
} from 'lucide-react';
import { SkeletonPage } from '../../components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed'];

const tabs = [
  { key: 'daily', label: 'Daily Summary', icon: FileText },
  { key: 'timecards', label: 'Timecards', icon: Clock },
  { key: 'utilization', label: 'Vehicle Utilization', icon: Truck },
  { key: 'ontime', label: 'On-Time', icon: CheckCircle2 },
  { key: 'costs', label: 'Cost Analysis', icon: DollarSign },
  { key: 'overtime', label: 'Overtime', icon: AlertTriangle }
];

export default function Reports() {
  const { apiFetch } = useAuth();
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    single: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadReport(); }, [tab, dateRange]);

  async function loadReport() {
    setLoading(true);
    try {
      let result;
      switch (tab) {
        case 'daily':
          result = await apiFetch(`/reports/daily?date=${dateRange.single}`);
          break;
        case 'timecards':
          result = await apiFetch(`/reports/timecards?startDate=${dateRange.start}&endDate=${dateRange.end}`);
          break;
        case 'utilization':
          result = await apiFetch(`/reports/vehicle-utilization?startDate=${dateRange.start}&endDate=${dateRange.end}`);
          break;
        case 'ontime':
          result = await apiFetch(`/reports/on-time?startDate=${dateRange.start}&endDate=${dateRange.end}`);
          break;
        case 'costs':
          result = await apiFetch(`/reports/cost-analysis?startDate=${dateRange.start}&endDate=${dateRange.end}`);
          break;
        case 'overtime':
          result = await apiFetch(`/reports/overtime?startDate=${dateRange.start}&endDate=${dateRange.end}`);
          break;
      }
      setData(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function exportCSV(rows, filename) {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const val = typeof row[h] === 'object' ? JSON.stringify(row[h]) : row[h];
        return `"${val}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function renderDailyReport() {
    if (!data?.summary) return null;
    const s = data.summary;
    return (
      <>
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eef2ff' }}><BarChart3 size={20} color="var(--color-primary)" /></div>
            <div className="stat-value">{s.totalTrips}</div>
            <div className="stat-label">Total Trips</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5' }}><Users size={20} color="var(--color-green)" /></div>
            <div className="stat-value">{s.totalPassengers}</div>
            <div className="stat-label">Passengers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb' }}><Truck size={20} color="var(--color-yellow)" /></div>
            <div className="stat-value">{s.vehiclesInUse}/{s.vehiclesInUse + s.vehiclesAvailable}</div>
            <div className="stat-label">Vehicles In Use</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2' }}><DollarSign size={20} color="var(--color-red)" /></div>
            <div className="stat-value">${s.totalCost?.toFixed(0) || 0}</div>
            <div className="stat-label">Total Cost</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Trip Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Completed</span><strong style={{ color: 'var(--color-green)' }}>{s.completedTrips}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Active</span><strong style={{ color: 'var(--color-yellow)' }}>{s.activeTrips}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Ride Requests</span><strong>{s.totalRideRequests}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Shuttle Runs</span><strong>{s.totalShuttleRuns}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Shuttle Passengers</span><strong>{s.totalShuttlePassengers}</strong></div>
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Fleet & Drivers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Drivers On Duty</span><strong>{s.driversOnDuty}/{s.totalDrivers}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Vehicles Available</span><strong style={{ color: 'var(--color-green)' }}>{s.vehiclesAvailable}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Vehicles In Maintenance</span><strong style={{ color: 'var(--color-red)' }}>{s.vehiclesMaintenance}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Total Mileage</span><strong>{s.totalMileage} mi</strong></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderTimecards() {
    if (!data || !Array.isArray(data)) return null;
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(data.filter(t => t.driver).map(t => ({
            Driver: t.driver.name, Phone: t.driver.phone, 'Total Hours': t.totalHours,
            'Regular Hours': t.regularHours, 'OT Hours': t.overtimeHours,
            'Total Trips': t.totalTrips, 'Total Miles': t.totalMiles, 'Days Worked': t.daysWorked
          })), 'driver-timecards')}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-light)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Trips</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Regular</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: 'var(--color-red)' }}>OT</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Total Hrs</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Miles</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(t => t.driver).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.driver.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{t.totalTrips}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{t.regularHours}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: t.overtimeHours > 0 ? 'var(--color-red)' : 'inherit', fontWeight: t.overtimeHours > 0 ? 700 : 400 }}>
                    {t.overtimeHours}h
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{t.totalHours}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{t.totalMiles}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{t.daysWorked}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No timecard data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderUtilization() {
    if (!data || !Array.isArray(data)) return null;
    const chartData = data.filter(v => v.vehicle).map(v => ({ name: v.vehicle.name, rate: v.utilizationRate, trips: v.totalTrips }));
    return (
      <>
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Utilization Rate by Vehicle</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis unit="%" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)' }} />
              <Bar dataKey="rate" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-light)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Vehicle</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Utilization</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Trips</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Miles</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(v => v.vehicle).map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.vehicle.name} <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>({v.vehicle.licensePlate})</span></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', textTransform: 'capitalize' }}>{v.vehicle.type}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--color-gray-light)', overflow: 'hidden' }}>
                        <div style={{ width: `${v.utilizationRate}%`, height: '100%', borderRadius: 3, background: v.utilizationRate > 70 ? 'var(--color-green)' : v.utilizationRate > 30 ? 'var(--color-yellow)' : 'var(--color-red)' }} />
                      </div>
                      <span style={{ fontWeight: 700 }}>{v.utilizationRate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{v.totalTrips}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{v.totalMiles}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>${v.totalCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderOnTime() {
    if (!data) return null;
    return (
      <>
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5' }}><CheckCircle2 size={20} color="var(--color-green)" /></div>
            <div className="stat-value" style={{ color: 'var(--color-green)' }}>{data.onTimeRate}%</div>
            <div className="stat-label">On-Time Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5' }}><Timer size={20} color="var(--color-green)" /></div>
            <div className="stat-value">{data.onTime}</div>
            <div className="stat-label">On Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2' }}><AlertTriangle size={20} color="var(--color-red)" /></div>
            <div className="stat-value">{data.late}</div>
            <div className="stat-label">Late</div>
          </div>
        </div>

        {data.driverPerformance?.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 14 }}>Driver On-Time Performance</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Driver</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>On-Time Rate</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>On Time</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Late</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.driverPerformance.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: d.onTimeRate >= 90 ? 'var(--color-green)' : d.onTimeRate >= 70 ? 'var(--color-yellow)' : 'var(--color-red)' }}>{d.onTimeRate}%</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{d.onTime}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{d.late}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function renderCosts() {
    if (!data) return null;
    const pieData = Object.entries(data.breakdown || {}).filter(([_, v]) => v > 0).map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value }));
    return (
      <>
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eef2ff' }}><DollarSign size={20} color="var(--color-primary)" /></div>
            <div className="stat-value">${data.totalCost}</div>
            <div className="stat-label">Total Cost</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5' }}><TrendingUp size={20} color="var(--color-green)" /></div>
            <div className="stat-value">${data.costPerTrip}</div>
            <div className="stat-label">Cost/Trip</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb' }}><Truck size={20} color="var(--color-yellow)" /></div>
            <div className="stat-value">${data.costPerMile}</div>
            <div className="stat-label">Cost/Mile</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f1f5f9' }}><BarChart3 size={20} color="var(--color-text-secondary)" /></div>
            <div className="stat-value">{data.totalMileage}</div>
            <div className="stat-label">Total Miles</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Cost Breakdown Pie Chart */}
          {pieData.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Cost Breakdown</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily Cost Trend */}
          {data.dailyCosts?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Daily Cost Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.dailyCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" fontSize={11} tickFormatter={d => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                  <YAxis fontSize={11} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => `$${v}`} contentStyle={{ borderRadius: 10 }} />
                  <Line type="monotone" dataKey="cost" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderOvertime() {
    if (!data) return null;
    return (
      <>
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2' }}><AlertTriangle size={20} color="var(--color-red)" /></div>
            <div className="stat-value" style={{ color: 'var(--color-red)' }}>{data.totalOTHours}h</div>
            <div className="stat-label">Total OT Hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb' }}><Calendar size={20} color="var(--color-yellow)" /></div>
            <div className="stat-value">{data.totalOTDays}</div>
            <div className="stat-label">Days with OT</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eef2ff' }}><Users size={20} color="var(--color-primary)" /></div>
            <div className="stat-value">{data.driverBreakdown?.length || 0}</div>
            <div className="stat-label">Drivers with OT</div>
          </div>
        </div>

        {/* OT Trend Chart */}
        {data.dailyTrend?.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Overtime Trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={11} tickFormatter={d => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                <YAxis fontSize={11} unit="h" />
                <Tooltip contentStyle={{ borderRadius: 10 }} />
                <Bar dataKey="otHours" fill="#dc2626" radius={[6, 6, 0, 0]} name="OT Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Driver OT Breakdown */}
        {data.driverBreakdown?.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 14 }}>Driver Overtime Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>Driver</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>OT Hours</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>OT Days</th>
                </tr>
              </thead>
              <tbody>
                {(data.driverBreakdown || []).filter(d => d.driver).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.driver.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-red)', fontWeight: 700 }}>{d.totalOTHours}h</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{d.otDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
      </div>

      {/* Date Range Picker */}
      <div className="card" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Calendar size={18} color="var(--color-text-secondary)" />
        {tab === 'daily' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Date:</span>
            <input type="date" className="form-input" value={dateRange.single} onChange={e => setDateRange({ ...dateRange, single: e.target.value })} style={{ minHeight: 36, padding: '6px 12px' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>From:</span>
            <input type="date" className="form-input" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ minHeight: 36, padding: '6px 12px' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>To:</span>
            <input type="date" className="form-input" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={{ minHeight: 36, padding: '6px 12px' }} />
          </div>
        )}
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                background: tab === t.key ? 'var(--color-primary)' : 'var(--color-gray-light)',
                color: tab === t.key ? 'white' : 'var(--color-text-secondary)',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      {loading ? (
        <SkeletonPage cards={3} />
      ) : (
        <>
          {tab === 'daily' && renderDailyReport()}
          {tab === 'timecards' && renderTimecards()}
          {tab === 'utilization' && renderUtilization()}
          {tab === 'ontime' && renderOnTime()}
          {tab === 'costs' && renderCosts()}
          {tab === 'overtime' && renderOvertime()}
        </>
      )}
    </div>
  );
}
