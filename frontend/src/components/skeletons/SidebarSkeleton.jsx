import { Users, Search } from "lucide-react";

const SidebarSkeleton = () => {
  // Create 8 skeleton items
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside className="w-full lg:w-auto lg:min-w-[280px] lg:max-w-[500px] border-r border-base-300 flex flex-col bg-base-100 h-full relative">
      {/* Header */}
      <div className="border-b border-base-300 w-full px-5 py-3 sticky top-0 bg-base-100 z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <div className="relative">
              <button className="bg-base-200 p-2 rounded-full hover:bg-base-300 transition-colors cursor-pointer">
                <Users className="w-6 h-6" />
              </button>
            </div>

            <span className="font-medium hidden lg:block">Contacts</span>
          </div>

          <div className="hidden lg:flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-2">
              <input type="checkbox" className="checkbox checkbox-xs" />
              <span className="text-xs">Show online only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-base-300">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full bg-base-200 rounded-lg px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Skeleton Contacts */}
      <div className="overflow-y-auto w-full py-3">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-3 flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="relative mx-auto lg:mx-0">
              <div className="skeleton size-12 rounded-full" />
            </div>

            {/* User info skeleton - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;