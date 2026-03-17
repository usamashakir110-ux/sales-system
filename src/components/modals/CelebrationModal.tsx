'use client'
import { useEffect, useState } from 'react'
import { X, Zap } from 'lucide-react'

interface Props { title: string; subtitle: string; xp: number; onClose: () => void }

const COLORS = ['#f97316', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6']

export default function CelebrationModal({ title, subtitle, xp, onClose }: Props) {
  const [particles, setParticles] = useState<any[]>([])

  useEffect(() => {
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
    }))
    setParticles(p)

    // Auto close after 5s
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}>

      {/* Confetti */}
      {particles.map(p => (
        <div key={p.id} className="confetti-piece"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }} />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-8 animate-pop-in" onClick={e => e.stopPropagation()}>
        <div className="text-7xl mb-4 animate-pulse">💰</div>

        <h1 className="font-display font-black text-4xl md:text-6xl text-white mb-2" style={{
          textShadow: '0 0 40px rgba(249, 115, 22, 0.8)'
        }}>
          {title}
        </h1>

        <p className="text-xl text-gray-300 mb-6">{subtitle}</p>

        <div className="inline-flex items-center gap-3 bg-orange-500/20 border border-orange-500/40 rounded-2xl px-6 py-4 mb-8">
          <Zap size={24} className="text-orange-400" fill="currentColor" />
          <span className="font-display font-black text-3xl text-orange-400">+{xp.toLocaleString()} XP</span>
        </div>

        <p className="text-gray-400 text-sm mb-6">That's what talent + work looks like. 🔥</p>

        <button onClick={onClose}
          className="bg-white text-black font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors">
          Keep Going
        </button>

        <p className="text-gray-600 text-xs mt-4">Auto-closes in 5 seconds</p>
      </div>
    </div>
  )
}
