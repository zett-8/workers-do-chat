import { useEffect, useState } from 'react'

function ParticlesClient() {
  const [ParticlesComponent, setParticlesComponent] = useState<React.FC | null>(null)

  useEffect(() => {
    const loadParticles = async () => {
      const [{ Particles, initParticlesEngine }, { loadSlim }, { MoveDirection, OutMode }] = await Promise.all([
        import('@tsparticles/react'),
        import('@tsparticles/slim'),
        import('@tsparticles/engine'),
      ])

      await initParticlesEngine(async (engine) => {
        await loadSlim(engine)
      })

      const options = {
        background: {
          color: {
            value: '#fff',
          },
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: 'push',
            },
            onHover: {
              enable: true,
              mode: 'repulse',
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 200,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: '#222',
          },
          links: {
            color: '#222',
            distance: 150,
            enable: true,
            opacity: 0.5,
            width: 1,
          },
          move: {
            direction: MoveDirection.none,
            enable: true,
            outModes: {
              default: OutMode.out,
            },
            random: false,
            speed: 3,
            straight: false,
          },
          number: {
            density: {
              enable: true,
            },
            value: 90,
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: 'circle',
          },
          size: {
            value: { min: 2, max: 5 },
          },
        },
        detectRetina: true,
      }

      const ParticlesWrapper = () => <Particles id="tsparticles" options={options} />

      setParticlesComponent(() => ParticlesWrapper)
    }

    loadParticles()
  }, [])

  if (!ParticlesComponent) return null
  return <ParticlesComponent />
}

export default ParticlesClient
