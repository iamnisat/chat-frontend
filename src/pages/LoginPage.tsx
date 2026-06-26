import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LoginType } from "../types";

export function LoginPage() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<LoginType>("user");
  const [userId, setUserId] = useState("1");
  const [farmerId, setFarmerId] = useState("1");
  const [parentId, setParentId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = {
      loginType,
      userId: loginType === "user" ? parseInt(userId, 10) : undefined,
      farmerId: loginType === "farmer" ? parseInt(farmerId, 10) : undefined,
      parentId: parentId ? parseInt(parentId, 10) : undefined,
    };

    localStorage.setItem("chatUser", JSON.stringify(userData));
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Chat Login</h1>
          <p className="text-gray-500 mt-2">Select your identity to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Login Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLoginType("user")}
                className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                  loginType === "user"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setLoginType("farmer")}
                className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                  loginType === "farmer"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Farmer
              </button>
            </div>
          </div>

          {loginType === "user" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Farmer ID</label>
              <input
                type="number"
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Parent ID (optional)</label>
            <input
              type="number"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Start Chatting
          </button>
        </form>
      </div>
    </div>
  );
}
