import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TreeLifecycleAnimation from '../components/home/TreeLifecycleAnimation';
import {
  MapPin,
  ArrowRight,
  ShieldCheck,
  Compass,
  CheckCircle2,
  QrCode,
  Award,
  Activity,
  Trees,
  FileCheck2,
  Camera,
  Leaf,
  LineChart,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const workflowStages = [
    {
      num: '01',
      title: 'Discover',
      tag: 'Site Selection',
      desc: 'Select geographic coordinates on the interactive Leaflet map to inspect atmospheric and soil properties.',
      icon: Compass,
      stageGroup: 'Phase 1: Planning',
    },
    {
      num: '02',
      title: 'Assess',
      tag: 'Suitability Engine',
      desc: 'Evaluate location compatibility deterministically using real-time Open-Meteo weather and ISRIC SoilGrids data against canonical species rules.',
      icon: Leaf,
      stageGroup: 'Phase 1: Planning',
    },
    {
      num: '03',
      title: 'Plant',
      tag: 'Field Planting',
      desc: 'Plant the native sapling adhering to biological spacing, soil depth, and sunlight requirements.',
      icon: Trees,
      stageGroup: 'Phase 2: Execution',
    },
    {
      num: '04',
      title: 'Prove',
      tag: 'Evidence Submission',
      desc: 'Submit plantation date, precise GPS coordinates, and photographic field evidence for audit.',
      icon: Camera,
      stageGroup: 'Phase 2: Execution',
    },
    {
      num: '05',
      title: 'Verify',
      tag: 'Coordinator Audit',
      desc: 'Authorized coordinators review the submission queue, inspect evidence, and atomically approve or reject with written feedback.',
      icon: FileCheck2,
      stageGroup: 'Phase 3: Audit & Identity',
    },
    {
      num: '06',
      title: 'Identify',
      tag: 'Permanent Identity',
      desc: 'Backend generates an immutable, authoritative Tree ID (e.g. ER-PLT-00042) and public QR identity card.',
      icon: QrCode,
      stageGroup: 'Phase 3: Audit & Identity',
    },
    {
      num: '07',
      title: 'Monitor',
      tag: 'Caretaker Logs',
      desc: 'Caretakers inspect verified trees on-site, recording health logs restricted to 4 frozen clinical statuses with server-authoritative timestamps.',
      icon: Activity,
      stageGroup: 'Phase 4: Stewardship',
    },
    {
      num: '08',
      title: 'Reward',
      tag: 'Impact Ledger',
      desc: 'Contributors earn 50 authoritative reward points for each verified tree, tracked on an immutable transaction ledger.',
      icon: Award,
      stageGroup: 'Phase 4: Stewardship',
    },
    {
      num: '09',
      title: 'Track',
      tag: 'Long-Term Impact',
      desc: 'Follow longitudinal tree survival, historical observation timelines, and aggregated ecological impact across contributor and public dashboards.',
      icon: LineChart,
      stageGroup: 'Phase 5: Longitudinal Impact',
    },
  ];

  const pillarCards = [
    {
      title: 'Deterministic Science',
      desc: 'Biological suitability is computed directly against 10 canonical native species rules using ISRIC SoilGrids topsoil metrics and Open-Meteo atmospheric readings—never unverified AI estimations.',
    },
    {
      title: 'Human-Verified Audit',
      desc: 'Every tree undergoes review by an authorized coordinator. Approvals atomically issue authoritative IDs; rejections require mandatory written feedback.',
    },
    {
      title: 'Continuous Stewardship',
      desc: 'Physical QR codes link directly to public tree identities, allowing verified caretakers to record chronological health observations over the plant\'s entire lifetime.',
    },
  ];

  return (
    <div className="space-y-16 py-2">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-warm-400 p-8 sm:p-12 lg:p-16 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              <span>Authoritative Plantation Verification Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-charcoal-900 tracking-tight leading-[1.12]">
              Transparent Lifecycle Management for{' '}
              <span className="text-forest-800 italic">Every Planted Tree</span>
            </h1>

            <p className="text-charcoal-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
              EcoRevive bridges the gap between plantation drives and long-term tree survival. From GIS-based suitability evaluation and coordinator field audits to authoritative QR identities and continuous caretaker monitoring.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-6 py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl text-sm font-semibold shadow-subtle transition-colors"
              >
                <MapPin className="w-4 h-4 text-forest-200" />
                <span>Explore Map</span>
              </Link>

              {!isAuthenticated ? (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-warm-200 hover:bg-warm-300 text-charcoal-800 border border-warm-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  <span>Join as Contributor</span>
                  <ArrowRight className="w-4 h-4 text-charcoal-600" />
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-warm-200 hover:bg-warm-300 text-charcoal-800 border border-warm-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-charcoal-600" />
                </Link>
              )}
            </div>
          </div>

          {/* Right Hero Botanical Animation */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center items-center w-full">
            <TreeLifecycleAnimation />
          </div>
        </div>

        {/* Hero Bottom Metric Badges */}
        <div className="mt-10 pt-8 border-t border-warm-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">Suitability Model</span>
            <span className="font-semibold text-charcoal-800 font-mono text-sm">Deterministic</span>
          </div>
          <div>
            <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">External Data</span>
            <span className="font-semibold text-charcoal-800 font-mono text-sm">ISRIC + Open-Meteo</span>
          </div>
          <div>
            <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">Audit Protocol</span>
            <span className="font-semibold text-charcoal-800 font-mono text-sm">Coordinator Verified</span>
          </div>
          <div>
            <span className="text-charcoal-500 block text-[11px] uppercase tracking-wider">Per-Tree Reward</span>
            <span className="font-semibold text-forest-800 font-mono text-sm">50 Verified PTS</span>
          </div>
        </div>
      </section>

      {/* The 9-Stage Plantation Lifecycle - Connected Process */}
      <section className="space-y-8">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-800 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Complete Audit Trail</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
            The 9-Stage Plantation Lifecycle
          </h2>
          <p className="text-sm text-charcoal-600 leading-relaxed">
            From initial site discovery to permanent QR issuance, continuous health monitoring, and long-term impact tracking, each tree moves through an accountable digital workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.num}
                className="p-5 rounded-2xl bg-white border border-warm-400 hover:border-forest-400 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                      {stage.num}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-charcoal-500 font-semibold">
                      {stage.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-warm-200 text-forest-900 flex items-center justify-center group-hover:bg-forest-900 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-charcoal-900 text-base">{stage.title}</h3>
                  </div>

                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-warm-300/80 text-[11px] text-charcoal-500 font-mono">
                  {stage.stageGroup}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Principles / Architecture Pillars */}
      <section className="rounded-3xl bg-warm-200/50 border border-warm-400 p-8 sm:p-10 space-y-6">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-forest-800">
            Design Principles
          </span>
          <h2 className="text-2xl font-serif font-bold text-charcoal-900">
            Why Verification Matters in Ecological Restoration
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
            Plantation initiatives too often count saplings put in the ground rather than living trees that reach maturity. EcoRevive enforces rigor at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillarCards.map((pillar) => (
            <div
              key={pillar.title}
              className="p-5 rounded-2xl bg-white border border-warm-400 space-y-2 shadow-subtle"
            >
              <div className="flex items-center gap-2 text-forest-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0" />
                <span>{pillar.title}</span>
              </div>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Call to Action */}
      <section className="rounded-3xl bg-forest-900 text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-card">
        <div className="space-y-2 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white">
            Ready to inspect or plant a verified tree?
          </h2>
          <p className="text-xs sm:text-sm text-forest-200 leading-relaxed font-normal">
            Browse verified tree identities on the geospatial map, evaluate environmental metrics for any coordinate, or join as an active contributor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/map"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-warm-100 text-forest-900 text-xs sm:text-sm font-semibold transition-colors shadow-subtle"
          >
            Explore Interactive Map
          </Link>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-white border border-forest-600 text-xs sm:text-sm font-semibold transition-colors"
            >
              Register Account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
