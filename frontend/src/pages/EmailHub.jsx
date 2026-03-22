import Sidebar from "../components/Sidebar";
import EmailWorkspace from "../components/EmailWorkspace";

export default function EmailHub() {
  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <div className="flex-1 overflow-y-auto mt-16 md:mt-0 p-4 md:p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Email Hub</div>
          <h1 className="text-2xl md:text-3xl font-bold">Send, track, and reuse revenue emails from one workspace</h1>
          <p className="text-white/45 text-sm mt-2 max-w-3xl">
            Templates, tracked sends, and lead-linked email history are now part of the CRM instead of living in separate tabs.
          </p>
        </div>
        <EmailWorkspace />
      </div>
    </div>
  );
}
