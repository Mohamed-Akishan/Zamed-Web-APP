// src/components/Layout/Maintenance.jsx
const Maintenance = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
            <div className="text-center">
                <div className="text-8xl mb-8">🔧</div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                    Under Maintenance
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
                    We're currently updating our website. Please check back soon!
                </p>
                <div className="animate-pulse">
                    <p className="text-gray-400">Estimated completion time: 2-3 hours</p>
                </div>
            </div>
        </div>
    );
};

export default Maintenance; 