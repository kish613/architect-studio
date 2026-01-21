import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, type ProjectWithModels } from "@/lib/api";
import { 
  Home, 
  Building2, 
  Leaf, 
  Ruler, 
  BedDouble, 
  Layers, 
  Eye, 
  Pencil, 
  Download,
  CheckCircle,
  Clock,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Static fallback data when no projects exist
const staticProjects = [
  {
    id: "static-1",
    title: "Scandinavian Loft",
    type: "Residential",
    sqft: "1,200 sqft",
    area: "112 m²",
    rooms: "2 Bed, 2 Bath",
    status: "Render Ready",
    statusColor: "text-emerald-400",
    badge: { text: "Approved", icon: CheckCircle },
    icon: Home,
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    buttonText: "View Blueprints",
    buttonIcon: Eye,
  },
  {
    id: "static-2",
    title: "Tech HQ Wing",
    type: "Commercial",
    sqft: "15,000 sqft",
    area: "1,400 m²",
    capacity: "120 Desks",
    status: "Pending Review",
    statusColor: "text-orange-400",
    badge: { text: "In Progress", icon: Clock },
    icon: Building2,
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    buttonText: "Edit Layout",
    buttonIcon: Pencil,
  },
  {
    id: "static-3",
    title: "Eco-Villa B",
    type: "Sustainable",
    sqft: "2,400 sqft",
    area: "220 m²",
    category: "Passive House",
    status: "Print Ready",
    statusColor: "text-emerald-400",
    badge: { text: "Featured", icon: Star },
    icon: Leaf,
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    buttonText: "Download Plans",
    buttonIcon: Download,
  },
];

function ProjectCard({ project }: { project: ProjectWithModels }) {
  const model = project.models[0];
  const thumbnail = model?.isometricUrl || model?.originalUrl;
  const isCompleted = model?.status === 'completed';
  
  const getStatusInfo = () => {
    if (!model) return { text: 'Empty', color: 'text-slate-400' };
    switch (model.status) {
      case 'uploaded': return { text: 'Uploaded', color: 'text-slate-400' };
      case 'generating_isometric': return { text: 'Processing...', color: 'text-orange-400' };
      case 'isometric_ready': return { text: 'Isometric Ready', color: 'text-cyan-400' };
      case 'generating_3d': return { text: 'Creating 3D...', color: 'text-orange-400' };
      case 'completed': return { text: 'Render Ready', color: 'text-emerald-400' };
      case 'failed': return { text: 'Failed', color: 'text-red-400' };
      default: return { text: model.status, color: 'text-slate-400' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-cyan-900/10 transition-all duration-300 w-full h-[450px] bg-slate-900 cursor-pointer">
        {/* Background Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ 
            backgroundImage: thumbnail 
              ? `url('${thumbnail}')` 
              : "url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80')" 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

        {/* Badge */}
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white flex items-center gap-1">
          {isCompleted ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {isCompleted ? 'Complete' : 'In Progress'}
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="glass-overlay rounded-2xl p-5 mb-4 border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Home className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white font-[var(--font-poppins)]">
                  {project.name}
                </div>
                <div className="text-xs text-slate-300">
                  Project #{project.id}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                <div className="flex items-center text-slate-300 gap-2">
                  <Ruler className="w-4 h-4" />
                  Models
                </div>
                <span className="text-white font-medium">{project.models.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                <div className="flex items-center text-slate-300 gap-2">
                  <Layers className="w-4 h-4" />
                  Updated
                </div>
                <span className="text-white font-medium">
                  {new Date(project.lastModified).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-300 gap-2">
                  <Layers className="w-4 h-4" />
                  Status
                </div>
                <span className={`font-medium ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-cyan-50 transition-all text-sm font-semibold rounded-xl py-3.5">
            <Eye className="w-4 h-4" />
            View Blueprints
          </button>
        </div>
      </div>
    </Link>
  );
}

function StaticProjectCard({ project }: { project: typeof staticProjects[0] }) {
  const BadgeIcon = project.badge.icon;
  const ProjectIcon = project.icon;
  const ButtonIcon = project.buttonIcon;

  return (
    <div className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-cyan-900/10 transition-all duration-300 w-full h-[450px] bg-slate-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url('${project.image}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

      {/* Badge */}
      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white flex items-center gap-1">
        <BadgeIcon className="w-3 h-3" />
        {project.badge.text}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="glass-overlay rounded-2xl p-5 mb-4 border-slate-700/50 bg-slate-800/40">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full ${project.iconBg} flex items-center justify-center ${project.iconColor}`}>
              <ProjectIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white font-[var(--font-poppins)]">
                {project.title}
              </div>
              <div className="text-xs text-slate-300">
                {project.type} &bull; {project.sqft}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
              <div className="flex items-center text-slate-300 gap-2">
                <Ruler className="w-4 h-4" />
                Area
              </div>
              <span className="text-white font-medium">{project.area}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
              <div className="flex items-center text-slate-300 gap-2">
                {project.rooms ? <BedDouble className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                {project.rooms ? 'Rooms' : project.capacity ? 'Capacity' : 'Type'}
              </div>
              <span className="text-white font-medium">
                {project.rooms || project.capacity || project.category}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-slate-300 gap-2">
                <Layers className="w-4 h-4" />
                Status
              </div>
              <span className={`font-medium ${project.statusColor}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-cyan-50 transition-all text-sm font-semibold rounded-xl py-3.5">
          <ButtonIcon className="w-4 h-4" />
          {project.buttonText}
        </button>
      </div>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden w-full h-[450px] bg-slate-200">
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <Skeleton className="h-48 w-full rounded-2xl mb-4" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function FeaturedProjects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="font-[var(--font-poppins)] pb-24 px-4">
      {/* Section Header */}
      <div className="flex flex-col items-center mt-20 mb-10">
        <span className="text-cyan-600 font-semibold tracking-wider text-sm uppercase mb-2">
          Featured Projects
        </span>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight text-center">
          Recent Architectural Designs
        </h2>
      </div>

      {/* Projects Grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
          {isLoading ? (
            <>
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </>
          ) : hasProjects ? (
            projects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            staticProjects.map((project) => (
              <StaticProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
