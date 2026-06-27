import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (stored) {
      navigate("/chat", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = {
      loginType: "farmer",
      farmerId: `${name.trim()}_${Date.now()}`,
      userId: undefined,
      parentId: undefined,
      name: name.trim(),
    };

    localStorage.setItem("chatUser", JSON.stringify(userData));
    navigate("/chat");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 50%, #ede9fe 100%)" }}>
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-100/50 border border-purple-100/50 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200" style={{ background: "var(--own-gradient)" }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A1.875 1.875 0 0 1 5.625 3h12.75A1.875 1.875 0 0 1 20.25 4.875v10.5A1.875 1.875 0 0 1 18.375 17.25H7.5l-3.75 2.855Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
            <p className="text-sm text-gray-400 mt-1.5">Enter your name to start chatting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahim Uddin"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-gray-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style={{ background: "var(--own-gradient)" }}
            >
              Start Chatting
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-300 mt-6">Powered by AI</p>
      </div>
    </div>
  );
}
