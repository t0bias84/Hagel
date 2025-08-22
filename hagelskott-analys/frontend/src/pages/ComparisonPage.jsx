import React, { useState, useEffect } from 'react';
import { getMyShots } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ComparisonPage = () => {
    const [shots, setShots] = useState([]);
    const [selectedShots, setSelectedShots] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchShots = async () => {
            if (!user) {
                setError("You must be logged in to compare shots.");
                setLoading(false);
                return;
            }
            try {
                const response = await getMyShots();
                // Map backend data to frontend format if necessary
                const formattedShots = response.data.map(shot => ({
                    id: shot._id,
                    name: shot.metadata?.ammunition?.modelName || shot.filename || `Shot on ${new Date(shot.timestamp).toLocaleDateString()}`,
                    ...shot
                }));
                setShots(formattedShots);
            } catch (err) {
                setError('Failed to fetch your shots. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchShots();
    }, [user]);

    const handleSelectShot = (shot) => {
        setSelectedShots(prevSelected => {
            if (prevSelected.find(s => s.id === shot.id)) {
                return prevSelected.filter(s => s.id !== shot.id);
            } else {
                return [...prevSelected, shot];
            }
        });
    };

    const renderComparison = () => {
        if (selectedShots.length < 2) {
            return <div className="text-center text-gray-500 mt-8">Please select at least two shots to compare.</div>;
        }

        const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF'];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Visual Comparison */}
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 text-white">Visual Overlay</h3>
                    <div className="relative w-full aspect-square bg-white rounded-md border-2 border-gray-400">
                        {/* Center Point */}
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                        {selectedShots.map((shot, shotIndex) => (
                            (shot.analysis_results.individual_pellets || []).map((pellet, pelletIndex) => (
                                <div
                                    key={`${shot.id}-${pelletIndex}`}
                                    className="absolute w-1 h-1 rounded-full"
                                    style={{
                                        left: `${pellet.x}%`,
                                        top: `${pellet.y}%`,
                                        backgroundColor: colors[shotIndex % colors.length],
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    title={`Shot ${shotIndex + 1}`}
                                ></div>
                            ))
                        ))}
                    </div>
                </div>

                {/* Data Table Comparison */}
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 text-white">Data Comparison</h3>
                    <table className="w-full text-left text-white">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="p-2">Metric</th>
                                {selectedShots.map(shot => (
                                    <th key={shot.id} className="p-2">{shot.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-700">
                                <td className="p-2 font-semibold">Pattern Score</td>
                                {selectedShots.map(shot => (
                                    <td key={shot.id} className="p-2 text-2xl font-bold">{shot.analysis_results.pattern_score || 'N/A'}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-gray-700">
                                <td className="p-2 font-semibold">Hit Count</td>
                                {selectedShots.map(shot => (
                                    <td key={shot.id} className="p-2">{shot.analysis_results.hit_count}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-gray-700">
                                <td className="p-2 font-semibold">Spread (cm)</td>
                                {selectedShots.map(shot => (
                                    <td key={shot.id} className="p-2">{shot.analysis_results.spread?.toFixed(2) || 'N/A'}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 text-white">
            <h1 className="text-3xl font-bold mb-4">Compare Shot Patterns</h1>

            {loading && (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                    <p className="ml-4">Loading your shots...</p>
                </div>
            )}
            {error && <p className="text-red-500 text-center">{error}</p>}

            {!loading && !error && (
                <div>
                    {shots.length > 0 ? (
                        <>
                            <h2 className="text-2xl font-semibold mb-4">Select Shots to Compare</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {shots.map(shot => (
                                    <div
                                        key={shot.id}
                                        onClick={() => handleSelectShot(shot)}
                                        className={`p-4 rounded-lg cursor-pointer transition-all ${selectedShots.find(s => s.id === shot.id) ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        <h3 className="font-bold truncate">{shot.name}</h3>
                                        <p>Score: {shot.analysis_results.pattern_score || 'N/A'}</p>
                                        <p className="text-xs text-gray-400">{new Date(shot.timestamp).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-400 mt-8">
                            <h2 className="text-2xl">No shots found</h2>
                            <p>You haven't analyzed any shots yet. Upload one to get started!</p>
                        </div>
                    )}

                    {renderComparison()}
                </div>
            )}
        </div>
    );
};

export default ComparisonPage;
