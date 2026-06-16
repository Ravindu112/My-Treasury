import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Hero Section */}
            <div className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="space-y-6">
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                            Manage Your Project <span className="text-blue-600">Budget</span> Effortlessly
                        </h1>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            My Treasury helps you track expenses, manage budgets, and collaborate with your team. Keep your projects organized and finances transparent.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            {user ? (
                                <Link
                                    to="/dashboard"
                                    className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-center"
                                >
                                    Go to My Projects
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-center"
                                    >
                                        Get Started
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="inline-block bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-center"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Features Preview */}
                    <div className="hidden md:block space-y-4">
                        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="text-2xl">📊</div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Budget Tracking</h3>
                                    <p className="text-gray-600 text-sm mt-1">Monitor spending and remaining budget in real-time</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="text-2xl">👥</div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Team Collaboration</h3>
                                    <p className="text-gray-600 text-sm mt-1">Add members and assign roles for better control</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="text-2xl">📝</div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Task Management</h3>
                                    <p className="text-gray-600 text-sm mt-1">Create tasks, track expenses, and stay organized</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-white py-16 sm:py-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
                        Why Choose My Treasury?
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security' },
                            { icon: '⚡', title: 'Fast', desc: 'Lightning quick performance' },
                            { icon: '📱', title: 'Responsive', desc: 'Works on all devices' },
                            { icon: '🎯', title: 'Easy', desc: 'Simple and intuitive' },
                        ].map((feature, i) => (
                            <div key={i} className="text-center">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="font-semibold text-gray-900 text-lg">{feature.title}</h3>
                                <p className="text-gray-600 text-sm mt-2">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            {!user && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16 sm:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Ready to take control of your budget?
                        </h2>
                        <p className="text-blue-100 text-lg mb-8">
                            Start managing your projects and expenses today
                        </p>
                        <Link
                            to="/register"
                            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            Create Free Account
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
