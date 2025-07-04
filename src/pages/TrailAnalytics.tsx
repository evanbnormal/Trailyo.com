import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Users, TrendingUp, BarChart3, Gift, ChevronLeft, ChevronRight, Image as ImageIcon, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { analyticsService, TrailAnalytics as RealTrailAnalytics } from '@/lib/analytics';

interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'reward';
  source: string;
  thumbnailUrl?: string;
  isSaved?: boolean;
  duration?: number;
}

interface Trail {
  id: string;
  title: string;
  description: string;
  status: 'published' | 'draft';
  createdAt: string;
  views: number;
  earnings: number;
  steps: TrailStep[];
  thumbnailUrl?: string;
  shareableLink?: string;
  suggestedInvestment?: number;
  trailValue?: number;
  trailCurrency?: string;
  creator?: string;
}

interface AnalyticsData {
  revenue: number;
  tips: number;
  totalLearners: number;
  completionRate: number;
  dropOffData: Array<{
    step: number;
    stepTitle: string;
    learnersReached: number;
    learnersCompleted: number;
    retentionRate: number;
  }>;
  revenueOverTime: Array<{
    date: string;
    revenue: number;
  }>;
  revenueByWeek: Array<{ week: string; revenue: number; month: string }>;
  revenueByDay: Array<{ day: string; revenue: number; weekDate: string }>;
  totalWatchTime: number; // in minutes
  watchTimePerStep: Array<{ stepTitle: string; watchTime: number }>; // in minutes
  revenueByStep: Array<{ stepTitle: string; revenue: number }>;
  learnersByStep: Array<{ stepTitle: string; learners: number }>;
  dropOffOverTime: Array<{ date: string; dropOff: number }>;
  dropOffByTime: Array<{ time: string; learners: number }>;
  watchTimeByTime: Array<{ time: string; watchTime: number }>;
  watchTimeOverTime: Array<{ date: string; watchTime: number }>;
}

type ActiveMetric = 'revenue' | 'tips' | 'learners' | 'completion' | 'dropoff' | 'watchtime';

const TrailAnalytics: React.FC = () => {
  const { trailId } = useParams<{ trailId: string }>();
  const navigate = useNavigate();
  const { getUserTrails } = useAuth();
  
  const [trail, setTrail] = useState<Trail | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('revenue');
  const [isMobile, setIsMobile] = useState(false);
  const [watchTimeToggle, setWatchTimeToggle] = useState<'total' | 'perStep' | 'overTime'>('total');
  const [revenueTimeToggle, setRevenueTimeToggle] = useState<'day' | 'week' | 'month'>('month');
  const [revenueViewToggle, setRevenueViewToggle] = useState<'time' | 'step'>('time');
  const [tipsToggle, setTipsToggle] = useState<'proportion' | 'overtime'>('proportion');
  const [tipsTimeToggle, setTipsTimeToggle] = useState<'day' | 'week' | 'month'>('month');
  const [dropoffToggle, setDropoffToggle] = useState<'step' | 'time'>('step');
  const [learnersToggle, setLearnersToggle] = useState<'total' | 'step'>('total');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedMonth, setSelectedMonth] = useState('12');
  const [selectedWeek, setSelectedWeek] = useState('WEEK 1');

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const loadTrailAndAnalytics = async () => {
      if (!trailId) return;

      try {
        // Load trail data
        const userTrails = await getUserTrails();
        const allUserTrails = [...userTrails.drafts, ...userTrails.published];
        const foundTrail = allUserTrails.find(t => t.id === trailId);
        
        if (foundTrail) {
          setTrail(foundTrail);
          
          // Load real analytics data
          const realAnalytics = await analyticsService.getTrailAnalytics(trailId);
          
          if (realAnalytics) {
          // Convert real analytics to the expected format
          const analyticsData: AnalyticsData = {
            revenue: realAnalytics.totalRevenue,
            tips: realAnalytics.totalTips,
            totalLearners: realAnalytics.totalLearners,
            completionRate: realAnalytics.completionRate,
            dropOffData: foundTrail.steps.map((step, index) => {
              const stepRetention = realAnalytics.stepRetention.find(s => s.stepIndex === index);
              return {
                step: index + 1,
                stepTitle: step.title,
                learnersReached: stepRetention?.learnersReached || 0,
                learnersCompleted: stepRetention?.learnersReached || 0,
                retentionRate: stepRetention?.retentionRate || 0
              };
            }),
            revenueOverTime: [
              { date: '2024-01', revenue: 0 },
              { date: '2024-02', revenue: Math.round(realAnalytics.totalRevenue * 0.1) },
              { date: '2024-03', revenue: Math.round(realAnalytics.totalRevenue * 0.2) },
              { date: '2024-04', revenue: Math.round(realAnalytics.totalRevenue * 0.3) },
              { date: '2024-05', revenue: Math.round(realAnalytics.totalRevenue * 0.4) },
              { date: '2024-06', revenue: Math.round(realAnalytics.totalRevenue * 0.5) },
              { date: '2024-07', revenue: Math.round(realAnalytics.totalRevenue * 0.6) },
              { date: '2024-08', revenue: Math.round(realAnalytics.totalRevenue * 0.7) },
              { date: '2024-09', revenue: Math.round(realAnalytics.totalRevenue * 0.8) },
              { date: '2024-10', revenue: Math.round(realAnalytics.totalRevenue * 0.9) },
              { date: '2024-11', revenue: Math.round(realAnalytics.totalRevenue * 0.95) },
              { date: '2024-12', revenue: realAnalytics.totalRevenue }
            ],
            revenueByWeek: [
              { week: 'WEEK 1', revenue: Math.round(realAnalytics.totalRevenue * 0.25), month: 'December 2024' },
              { week: 'WEEK 2', revenue: Math.round(realAnalytics.totalRevenue * 0.25), month: 'December 2024' },
              { week: 'WEEK 3', revenue: Math.round(realAnalytics.totalRevenue * 0.25), month: 'December 2024' },
              { week: 'WEEK 4', revenue: Math.round(realAnalytics.totalRevenue * 0.25), month: 'December 2024' }
            ],
            revenueByDay: [
              { day: 'Monday', revenue: Math.round(realAnalytics.totalRevenue * 0.14), weekDate: 'Monday 7th' },
              { day: 'Tuesday', revenue: Math.round(realAnalytics.totalRevenue * 0.14), weekDate: 'Monday 7th' },
              { day: 'Wednesday', revenue: Math.round(realAnalytics.totalRevenue * 0.14), weekDate: 'Monday 7th' },
              { day: 'Thursday', revenue: Math.round(realAnalytics.totalRevenue * 0.14), weekDate: 'Monday 7th' },
              { day: 'Friday', revenue: Math.round(realAnalytics.totalRevenue * 0.14), weekDate: 'Monday 7th' },
              { day: 'Saturday', revenue: Math.round(realAnalytics.totalRevenue * 0.15), weekDate: 'Monday 7th' },
              { day: 'Sunday', revenue: Math.round(realAnalytics.totalRevenue * 0.15), weekDate: 'Monday 7th' }
            ],
            totalWatchTime: realAnalytics.totalWatchTime,
            watchTimePerStep: foundTrail.steps.map((step, idx) => {
              const videoWatchTime = realAnalytics.videoWatchTime.find(s => s.stepIndex === idx);
              return {
                stepTitle: step.title,
                watchTime: videoWatchTime?.totalWatchTime || 0
              };
            }),
            revenueByStep: foundTrail.steps.map((step, idx) => {
              const revenueByStep = realAnalytics.revenueByStep.find(s => s.stepIndex === idx);
              return {
                stepTitle: step.title,
                revenue: (revenueByStep?.skipRevenue || 0) + (revenueByStep?.tipRevenue || 0)
              };
            }),
            learnersByStep: foundTrail.steps.map((step, idx) => {
              const stepRetention = realAnalytics.stepRetention.find(s => s.stepIndex === idx);
              return {
                stepTitle: step.title,
                learners: stepRetention?.learnersReached || 0
              };
            }),
            dropOffOverTime: [
              { date: '2024-01', dropOff: 15 },
              { date: '2024-02', dropOff: 18 },
              { date: '2024-03', dropOff: 22 },
              { date: '2024-04', dropOff: 25 },
              { date: '2024-05', dropOff: 28 },
              { date: '2024-06', dropOff: 30 },
              { date: '2024-07', dropOff: 32 },
              { date: '2024-08', dropOff: 35 },
              { date: '2024-09', dropOff: 38 },
              { date: '2024-10', dropOff: 40 },
              { date: '2024-11', dropOff: 42 },
              { date: '2024-12', dropOff: 45 }
            ],
            dropOffByTime: [
              { time: '0 min', learners: realAnalytics.totalLearners },
              { time: '5 min', learners: Math.round(realAnalytics.totalLearners * 0.85) },
              { time: '10 min', learners: Math.round(realAnalytics.totalLearners * 0.72) },
              { time: '15 min', learners: Math.round(realAnalytics.totalLearners * 0.58) },
              { time: '20 min', learners: Math.round(realAnalytics.totalLearners * 0.45) },
              { time: '25 min', learners: Math.round(realAnalytics.totalLearners * 0.32) },
              { time: '30 min', learners: Math.round(realAnalytics.totalLearners * 0.28) },
              { time: '35 min', learners: Math.round(realAnalytics.totalLearners * 0.25) },
              { time: '40 min', learners: Math.round(realAnalytics.totalLearners * 0.22) }
            ],
            watchTimeByTime: [
              { time: '0 min', watchTime: 0 },
              { time: '5 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.1) },
              { time: '10 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.2) },
              { time: '15 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.3) },
              { time: '20 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.4) },
              { time: '25 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.5) },
              { time: '30 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.6) },
              { time: '35 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.7) },
              { time: '40 min', watchTime: Math.round(realAnalytics.totalWatchTime * 0.8) }
            ],
            watchTimeOverTime: [
              { date: '2024-01', watchTime: 0 },
              { date: '2024-02', watchTime: Math.round(realAnalytics.totalWatchTime * 0.1) },
              { date: '2024-03', watchTime: Math.round(realAnalytics.totalWatchTime * 0.2) },
              { date: '2024-04', watchTime: Math.round(realAnalytics.totalWatchTime * 0.3) },
              { date: '2024-05', watchTime: Math.round(realAnalytics.totalWatchTime * 0.4) },
              { date: '2024-06', watchTime: Math.round(realAnalytics.totalWatchTime * 0.5) },
              { date: '2024-07', watchTime: Math.round(realAnalytics.totalWatchTime * 0.6) },
              { date: '2024-08', watchTime: Math.round(realAnalytics.totalWatchTime * 0.7) },
              { date: '2024-09', watchTime: Math.round(realAnalytics.totalWatchTime * 0.8) },
              { date: '2024-10', watchTime: Math.round(realAnalytics.totalWatchTime * 0.9) },
              { date: '2024-11', watchTime: Math.round(realAnalytics.totalWatchTime * 0.95) },
              { date: '2024-12', watchTime: realAnalytics.totalWatchTime }
            ],
          };
          
          setAnalytics(analyticsData);
        } else {
          // No real analytics data yet, use empty data
          const emptyAnalytics: AnalyticsData = {
            revenue: 0,
            tips: 0,
            totalLearners: 0,
            completionRate: 0,
            dropOffData: foundTrail.steps.map((step, index) => ({
              step: index + 1,
              stepTitle: step.title,
              learnersReached: 0,
              learnersCompleted: 0,
              retentionRate: 0
            })),
            revenueOverTime: [],
            revenueByWeek: [],
            revenueByDay: [],
            totalWatchTime: 0,
            watchTimePerStep: foundTrail.steps.map(step => ({
              stepTitle: step.title,
              watchTime: 0
            })),
            revenueByStep: foundTrail.steps.map(step => ({
              stepTitle: step.title,
              revenue: 0
            })),
            learnersByStep: foundTrail.steps.map(step => ({
              stepTitle: step.title,
              learners: 0
            })),
            dropOffOverTime: [],
            dropOffByTime: [],
            watchTimeByTime: [],
            watchTimeOverTime: []
          };
          setAnalytics(emptyAnalytics);
        }
        
        setLoading(false);
      } else {
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error loading trail and analytics:', error);
      setLoading(false);
    }
  };

  loadTrailAndAnalytics();
}, [trailId, getUserTrails, navigate]);

  const getTrailThumbnail = (trail: Trail) => {
    // Use custom thumbnail if set, otherwise use reward step's thumbnail
    if (trail.thumbnailUrl) {
      return trail.thumbnailUrl;
    }

    // Find the reward step and use its thumbnail
    const rewardStep = trail.steps.find(step => step.type === 'reward' && step.thumbnailUrl);
    return rewardStep?.thumbnailUrl || '/placeholder.svg';
  };

  const renderChart = () => {
    if (!analytics) return null;

    const chartHeight = isMobile ? 'h-64' : 'h-80';

    switch (activeMetric) {
      case 'revenue':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Over Time
                </CardTitle>
                <div className="flex gap-2 items-center">
                  <ToggleGroup
                    type="single"
                    value={revenueViewToggle}
                    onValueChange={v => v && setRevenueViewToggle(v as 'time' | 'step')}
                    className="rounded-md bg-white border border-gray-200 flex gap-1 transition-all duration-300 h-9 items-center box-border p-1"
                  >
                    <ToggleGroupItem value="time" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Over Time</ToggleGroupItem>
                    <ToggleGroupItem value="step" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">By Step</ToggleGroupItem>
                  </ToggleGroup>
                  <div className={`flex gap-2 transition-all duration-300 ${revenueViewToggle === 'step' ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100 relative'}`}> 
                    <Button size="sm" variant={revenueTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('day')}>Days</Button>
                    <Button size="sm" variant={revenueTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('week')}>Weeks</Button>
                    <Button size="sm" variant={revenueTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setRevenueTimeToggle('month')}>Months</Button>
                  </div>
                </div>
              </div>
              {/* Period Selector Dropdown */}
              <div className="text-lg font-semibold text-gray-900 pt-1 min-w-[120px]">
                {revenueTimeToggle === 'month' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {revenueTimeToggle === 'week' && (
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Jan</SelectItem>
                      <SelectItem value="02">Feb</SelectItem>
                      <SelectItem value="03">Mar</SelectItem>
                      <SelectItem value="04">Apr</SelectItem>
                      <SelectItem value="05">May</SelectItem>
                      <SelectItem value="06">Jun</SelectItem>
                      <SelectItem value="07">Jul</SelectItem>
                      <SelectItem value="08">Aug</SelectItem>
                      <SelectItem value="09">Sep</SelectItem>
                      <SelectItem value="10">Oct</SelectItem>
                      <SelectItem value="11">Nov</SelectItem>
                      <SelectItem value="12">Dec</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {revenueTimeToggle === 'day' && (
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEK 1">Week 1</SelectItem>
                      <SelectItem value="WEEK 2">Week 2</SelectItem>
                      <SelectItem value="WEEK 3">Week 3</SelectItem>
                      <SelectItem value="WEEK 4">Week 4</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                {revenueViewToggle === 'time' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      if (revenueTimeToggle === 'month') {
                        // Filter by selected year
                        const monthly = analytics.revenueOverTime
                          .filter(item => item.date.startsWith(selectedYear))
                          .map((item, idx, arr) => ({
                            ...item,
                            date: new Date(item.date + '-01').toLocaleDateString('en-US', { month: 'short' }),
                            revenue: Number((idx === 0 ? item.revenue : item.revenue - arr[idx-1].revenue).toFixed(2))
                          }));
                        return (
                          <LineChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        );
                      } else if (revenueTimeToggle === 'week') {
                        // Filter by selected month
                        const monthStr = `${selectedYear}-${selectedMonth}`;
                        const weekly = analytics.revenueByWeek
                          .filter(item => (item.month || '').includes(monthStr))
                          .map((item, idx) => ({
                            ...item,
                            week: `Week ${idx + 1}`,
                            revenue: Number((item.revenue).toFixed(2))
                          }));
                        return (
                          <LineChart data={weekly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        );
                      } else {
                        // Filter by selected week (if needed)
                        const daily = analytics.revenueByDay
                          // .filter(item => item.weekDate === selectedWeek) // Uncomment if you want to filter by week
                          .map(item => ({
                            ...item,
                            revenue: Number(item.revenue.toFixed(2))
                          }));
                        return (
                          <LineChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        );
                      }
                    })()}
                  </ResponsiveContainer>
                ) : (
                  (() => {
                    console.log('BarChart By Step data:', analytics.revenueByStep);
                    if (!analytics.revenueByStep || analytics.revenueByStep.length === 0) {
                      return <div className="flex items-center justify-center h-full text-gray-400">No step data available</div>;
                    }
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.revenueByStep.map(item => ({
                          ...item,
                          revenue: Number(item.revenue.toFixed(2))
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="stepTitle" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'tips':
        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-orange-600" />
                  Tips Analytics
                </CardTitle>
                <div className="flex gap-2 items-center">
                  <ToggleGroup
                    type="single"
                    value={tipsToggle}
                    onValueChange={v => v && setTipsToggle(v as 'proportion' | 'overtime')}
                    className="rounded-md bg-white border border-gray-200 flex gap-1 transition-all duration-300 h-9 items-center box-border p-1"
                  >
                    <ToggleGroupItem value="overtime" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Over Time</ToggleGroupItem>
                    <ToggleGroupItem value="proportion" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">By Step</ToggleGroupItem>
                  </ToggleGroup>
                  <div className={`flex gap-2 transition-all duration-300 ${tipsToggle === 'proportion' ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100 relative'}`}> 
                    <Button size="sm" variant={tipsTimeToggle === 'day' ? 'default' : 'outline'} onClick={() => setTipsTimeToggle('day')}>Day</Button>
                    <Button size="sm" variant={tipsTimeToggle === 'week' ? 'default' : 'outline'} onClick={() => setTipsTimeToggle('week')}>Week</Button>
                    <Button size="sm" variant={tipsTimeToggle === 'month' ? 'default' : 'outline'} onClick={() => setTipsTimeToggle('month')}>Month</Button>
                  </div>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-900 pt-1 min-w-[120px]">
                {tipsTimeToggle === 'month' && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {tipsTimeToggle === 'week' && (
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Jan</SelectItem>
                      <SelectItem value="02">Feb</SelectItem>
                      <SelectItem value="03">Mar</SelectItem>
                      <SelectItem value="04">Apr</SelectItem>
                      <SelectItem value="05">May</SelectItem>
                      <SelectItem value="06">Jun</SelectItem>
                      <SelectItem value="07">Jul</SelectItem>
                      <SelectItem value="08">Aug</SelectItem>
                      <SelectItem value="09">Sep</SelectItem>
                      <SelectItem value="10">Oct</SelectItem>
                      <SelectItem value="11">Nov</SelectItem>
                      <SelectItem value="12">Dec</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {tipsTimeToggle === 'day' && (
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEK 1">Week 1</SelectItem>
                      <SelectItem value="WEEK 2">Week 2</SelectItem>
                      <SelectItem value="WEEK 3">Week 3</SelectItem>
                      <SelectItem value="WEEK 4">Week 4</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                {tipsToggle === 'overtime' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      if (tipsTimeToggle === 'month') {
                        // Filter by selected year
                        const monthly = analytics.revenueOverTime
                          .filter(item => item.date.startsWith(selectedYear))
                          .map((item, idx, arr) => ({
                            ...item,
                            tips: Number(((idx === 0 ? item.revenue : item.revenue - arr[idx-1].revenue) * 0.15).toFixed(2)),
                            date: new Date(item.date + '-01').toLocaleDateString('en-US', { month: 'short' })
                          }));
                        return (
                          <BarChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Tips']} />
                            <Bar dataKey="tips" fill="#f97316" />
                          </BarChart>
                        );
                      } else if (tipsTimeToggle === 'week') {
                        // Filter by selected month
                        const monthStr = `${selectedYear}-${selectedMonth}`;
                        const weekly = analytics.revenueByWeek
                          .filter(item => (item.month || '').includes(monthStr))
                          .map((item, idx) => ({
                            ...item,
                            tips: Number((item.revenue * 0.15).toFixed(2)),
                            week: `Week ${idx + 1}`
                          }));
                        return (
                          <BarChart data={weekly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Tips']} />
                            <Bar dataKey="tips" fill="#f97316" />
                          </BarChart>
                        );
                      } else {
                        // Filter by selected week (if needed)
                        const daily = analytics.revenueByDay
                          // .filter(item => item.weekDate === selectedWeek) // Uncomment if you want to filter by week
                          .map(item => ({
                            ...item,
                            tips: Number((item.revenue * 0.15).toFixed(2))
                          }));
                        return (
                          <BarChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Tips']} />
                            <Bar dataKey="tips" fill="#f97316" />
                          </BarChart>
                        );
                      }
                    })()}
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.revenueByStep.map(item => ({
                      ...item,
                      tips: Number((item.revenue * 0.15).toFixed(2))
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stepTitle" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Tips']} />
                      <Bar dataKey="tips" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'learners':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                Learners Analytics
              </CardTitle>
              <div className="flex gap-2 items-center">
                <ToggleGroup
                  type="single"
                  value={learnersToggle}
                  onValueChange={v => v && setLearnersToggle(v as 'total' | 'step')}
                  className="rounded-md bg-white border border-gray-200 flex gap-1 transition-all duration-300 h-9 items-center box-border p-1"
                >
                  <ToggleGroupItem value="total" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Total</ToggleGroupItem>
                  <ToggleGroupItem value="step" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">By Step</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                {learnersToggle === 'total' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Total Learners', value: analytics.totalLearners }]}> 
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.learnersByStep}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stepTitle" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="learners" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'completion':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Completion Rate
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled>Completion Rate</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Total Learners', value: analytics.totalLearners, fill: '#6b7280' },
                    { name: 'Completed', value: Math.round(analytics.totalLearners * analytics.completionRate / 100), fill: '#8b5cf6' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'dropoff':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-red-600" />
                Retention Analytics
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={dropoffToggle === 'step' ? 'default' : 'outline'} onClick={() => setDropoffToggle('step')}>By Step</Button>
                <Button size="sm" variant={dropoffToggle === 'time' ? 'default' : 'outline'} onClick={() => setDropoffToggle('time')}>Over Time</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                {dropoffToggle === 'step' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dropOffData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="step" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="learnersReached" fill="#10b981" />
                      <Bar dataKey="learnersCompleted" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dropOffOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="dropOff" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'watchtime':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                Watch Time Analytics
              </CardTitle>
              <div className="flex gap-2 items-center">
                <ToggleGroup
                  type="single"
                  value={watchTimeToggle}
                  onValueChange={v => v && setWatchTimeToggle(v as 'total' | 'perStep' | 'overTime')}
                  className="rounded-md bg-white border border-gray-200 flex gap-1 transition-all duration-300 h-9 items-center box-border p-1"
                >
                  <ToggleGroupItem value="total" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Total</ToggleGroupItem>
                  <ToggleGroupItem value="perStep" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">By Step</ToggleGroupItem>
                  <ToggleGroupItem value="overTime" className="rounded-md px-4 h-7 min-h-0 py-0 flex items-center justify-center font-semibold text-sm box-border transition-all duration-300 data-[state=on]:bg-black data-[state=on]:text-white data-[state=off]:bg-white data-[state=off]:text-black">Over Time</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${chartHeight} w-full`}>
                {watchTimeToggle === 'total' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total Watch Time', value: analytics.totalWatchTime, fill: '#6b7280' },
                      { name: 'Average Watch Time', value: analytics.totalWatchTime / analytics.totalLearners, fill: '#8b5cf6' }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : watchTimeToggle === 'perStep' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.watchTimePerStep}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stepTitle" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="watchTime" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.watchTimeOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="watchTime" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trail Analytics</h1>
              <p className="text-gray-600">Detailed insights for your trail performance</p>
            </div>
          </div>
        </div>
      </div>
      {/* Layout: Sidebar + Main Content */}
      <div className="flex relative gap-x-4 lg:gap-x-8">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 min-h-screen transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-16'} ${isMobile ? (sidebarOpen ? 'fixed top-0 left-0 z-[999] h-screen overflow-y-auto' : 'relative') : 'relative overflow-hidden'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="p-4">
            {/* Toggle Button - aligned to right */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2"
              >
                {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            {/* Content - hidden when collapsed */}
            {sidebarOpen && (
              <>
                {/* Trail Card - matches Profile page design */}
                {trail && (
                  <Card className="mb-6 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                    <div className="relative">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gray-200">
                        {getTrailThumbnail(trail) ? (
                          <img 
                            src={getTrailThumbnail(trail)} 
                            alt={trail.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          {trail.status === 'published' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Content */}
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {trail.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {trail.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{trail.steps.length} steps</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                )}
                {/* KPIs */}
                {analytics && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'revenue' ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('revenue')}>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Revenue</p>
                          <p className="text-lg font-bold text-green-600">${analytics.revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'tips' ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('tips')}>
                      <div className="flex items-center gap-3">
                        <Gift className="h-5 w-5 text-orange-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Tips</p>
                          <p className="text-lg font-bold text-orange-600">${analytics.tips.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'learners' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('learners')}>
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Total Learners</p>
                          <p className="text-lg font-bold text-blue-600">{analytics.totalLearners}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'completion' ? 'bg-purple-100 border-2 border-purple-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('completion')}>
                      <div className="flex items-center justify-center gap-3">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Completion Rate</p>
                          <p className="text-lg font-bold text-purple-600">{analytics.completionRate}%</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'dropoff' ? 'bg-red-100 border-2 border-red-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('dropoff')}>
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Retention Rate</p>
                          <p className="text-lg font-bold text-red-600">{analytics.dropOffData[0]?.retentionRate || 0}%</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg cursor-pointer transition-colors ${activeMetric === 'watchtime' ? 'bg-amber-100 border-2 border-amber-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveMetric('watchtime')}>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Watch Time</p>
                          <p className="text-lg font-bold text-amber-600">{analytics.totalWatchTime || 0} min</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : isMobile ? 'ml-0' : 'ml-4'} ${isMobile ? 'min-h-screen' : ''} pt-6`}>
          <div className={`mx-auto w-full ${isMobile ? 'max-w-full' : 'max-w-4xl'}`}>
            {renderChart()}
          </div>
        </div>
      </div>
      {/* Dark overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[998]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default TrailAnalytics;