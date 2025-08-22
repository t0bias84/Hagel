import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { getPublicAnalyses } from '../services/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const CHOKE_OPTIONS = [
  "Cylinder", "Improved Cylinder", "Modified", "Improved Modified", "Full", "Extra Full", "Custom"
];

const PublicAnalysesPage = () => {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        gun_manufacturer: '',
        choke: '',
        ammunition_type: '',
        sort_by: 'analysis_results.pattern_score',
        sort_order: -1
    });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchPublicAnalyses = async () => {
            setLoading(true);
            try {
                const response = await getPublicAnalyses(filters);
                setAnalyses(response.data);
            } catch (err) {
                setError('Failed to fetch public analyses.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const handler = setTimeout(() => {
            fetchPublicAnalyses();
        }, 500); // Debounce requests

        return () => clearTimeout(handler);
    }, [filters]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const renderedAnalyses = useMemo(() => analyses.map(analysis => (
        <Card key={analysis._id} className="bg-gray-800 border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => navigate(`/analysis/${analysis._id}`)}>
            <CardContent className="p-4 flex justify-between items-center">
                <div>
                    <p className="font-bold text-lg">{analysis.metadata?.shotgun?.manufacturer || 'Unknown Firearm'} {analysis.metadata?.shotgun?.model}</p>
                    <p className="text-sm text-gray-300">{analysis.metadata?.ammunition?.modelName || 'Unknown Ammo'}</p>
                    <p className="text-xs text-gray-500">Shared by {analysis.username}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{analysis.analysis_results.pattern_score}</p>
                    <p className="text-xs text-gray-400">Pattern Score</p>
                </div>
            </CardContent>
        </Card>
    )), [analyses, navigate]);

    return (
        <div className="container mx-auto p-4 text-white">
            <h1 className="text-3xl font-bold mb-4">Public Analyses - "Best Loads"</h1>
            <p className="text-gray-400 mb-6">Explore and compare shot patterns shared by the community.</p>

            <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <SlidersHorizontal className="mr-2" />
                        Filter & Sort
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="gun_manufacturer" className="block text-sm font-medium mb-1">Firearm Manufacturer</Label>
                        <Input id="gun_manufacturer" name="gun_manufacturer" onChange={(e) => handleFilterChange('gun_manufacturer', e.target.value)} className="w-full p-2 rounded bg-gray-700 border-gray-600" placeholder="e.g., Browning" />
                    </div>
                    <div>
                        <Label htmlFor="choke" className="block text-sm font-medium mb-1">Choke</Label>
                        <Select onValueChange={(value) => handleFilterChange('choke', value)}>
                            <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                                <SelectValue placeholder="Any Choke" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Any Choke</SelectItem>
                                {CHOKE_OPTIONS.map(choke => <SelectItem key={choke} value={choke}>{choke}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="ammunition_type" className="block text-sm font-medium mb-1">Ammunition Type</Label>
                         <Select onValueChange={(value) => handleFilterChange('ammunition_type', value)}>
                            <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                                <SelectValue placeholder="Any Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Any Type</SelectItem>
                                <SelectItem value="factory">Factory</SelectItem>
                                <SelectItem value="handload">Handload</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="sort_by" className="block text-sm font-medium mb-1">Sort By</Label>
                        <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange('sort_by', value)}>
                            <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="analysis_results.pattern_score">Best Score</SelectItem>
                                <SelectItem value="timestamp">Most Recent</SelectItem>
                                <SelectItem value="analysis_results.hit_count">Highest Hit Count</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8" />
                </div>
            ) : error ? (
                <p className="text-red-500 text-center">{error}</p>
            ) : (
                <div className="space-y-4">
                    {analyses.length > 0 ? renderedAnalyses : <p className="text-center text-gray-500">No public analyses found matching your criteria.</p>}
                </div>
            )}
        </div>
    );
};

export default PublicAnalysesPage;
