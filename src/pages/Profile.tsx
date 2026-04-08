import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Upload, FileText, CheckCircle, Loader2, User, Mail, Calendar, Tag, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseResume } from '../services/geminiService';

const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to parse resume');

      const data = await response.json();
      const resumeText = data.text;
      
      // Extract skills and keywords using Gemini
      const { skills, experienceKeywords } = await parseResume(resumeText);
      
      await updateProfile({ 
        resumeText,
        skills,
        experienceKeywords
      });
      setSuccess(true);
    } catch (error) {
      console.error('Error uploading resume:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Your Profile</h2>
        <p className="text-slate-500">Manage your personal information and resume context.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <img
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{profile?.displayName || 'User'}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <User size={16} className="text-slate-400" />
              <span>UID: {user?.uid.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Mail size={16} className="text-slate-400" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar size={16} className="text-slate-400" />
              <span>Joined: {new Date(profile?.createdAt || '').toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              Resume Context
            </h3>
            {profile?.resumeText && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle size={12} />
                Active
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            Upload your resume (PDF) to help the AI generate more personalized interview questions based on your experience and skills.
          </p>

          <div className="relative group">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={uploading}
            />
            <div className={`p-8 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-4 ${
              uploading ? 'bg-slate-50 border-slate-200' : 
              success ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/30'
            }`}>
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-sm font-bold text-indigo-600">Analyzing Resume...</p>
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-600">Resume Uploaded Successfully!</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900">Click or drag to upload</p>
                    <p className="text-xs text-slate-500">PDF files only (max 5MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {profile?.resumeText && (
            <div className="space-y-6 pt-4 border-t border-slate-50">
              {profile.skills && profile.skills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Tag size={12} />
                    Extracted Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.experienceKeywords && profile.experienceKeywords.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Briefcase size={12} />
                    Experience Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.experienceKeywords.map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-full border border-slate-100">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Extracted Content Preview</p>
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono line-clamp-6 leading-relaxed">
                  {profile.resumeText}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
