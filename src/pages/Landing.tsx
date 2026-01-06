import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Users, 
  Zap, 
  BarChart3,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cryptoPrices } from '@/data/mockData';
import logo from '@/assets/logo.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Green Bull" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-display text-xl font-bold text-foreground">Green Bull</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#plans" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plans</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(142_76%_45%_/_0.12)_0%,_transparent_50%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Start earning today</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Invest Smart.
              <br />
              <span className="text-gradient">Grow Faster.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of investors earning passive income through our secure crypto investment platform. Copy top traders or choose from our curated investment plans.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 glow-green">
                  Start Investing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="#how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border text-foreground hover:bg-secondary">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-primary">$50M+</p>
                <p className="text-muted-foreground mt-1">Total Invested</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-primary">25K+</p>
                <p className="text-muted-foreground mt-1">Active Users</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-primary">95%</p>
                <p className="text-muted-foreground mt-1">Success Rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Ticker */}
      <section className="border-y border-border bg-card/50 py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...cryptoPrices, ...cryptoPrices].map((crypto, index) => (
            <div key={index} className="flex items-center gap-6 mx-8">
              <span className="text-xl">{crypto.icon}</span>
              <span className="font-medium text-foreground">{crypto.symbol}</span>
              <span className="text-muted-foreground">${crypto.price.toLocaleString()}</span>
              <span className={crypto.change24h >= 0 ? 'text-primary' : 'text-destructive'}>
                {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Why Choose Green Bull?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide the tools and security you need to grow your crypto investments with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Bank-Grade Security',
                description: 'Your investments are protected with military-grade encryption and multi-factor authentication.',
              },
              {
                icon: TrendingUp,
                title: 'High Returns',
                description: 'Earn up to 80% annual returns with our carefully curated investment strategies.',
              },
              {
                icon: Users,
                title: 'Copy Trading',
                description: 'Follow and copy trades from our top-performing professional traders automatically.',
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analytics',
                description: 'Track your portfolio performance with detailed charts and analytics dashboard.',
              },
              {
                icon: Zap,
                title: 'Instant Deposits',
                description: 'Start investing immediately with our instant cryptocurrency deposit system.',
              },
              {
                icon: Lock,
                title: 'Insured Funds',
                description: 'All investments are insured up to $250,000 for your peace of mind.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover-lift"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in just 3 simple steps and begin your investment journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Create Account',
                description: 'Sign up in minutes with just your email. Verify your identity to unlock all features.',
              },
              {
                step: '02',
                title: 'Deposit Crypto',
                description: 'Add funds via cryptocurrency. Minimum $100 in BTC, ETH, or USDT to start.',
              },
              {
                step: '03',
                title: 'Start Earning',
                description: 'Choose an investment plan or copy a trader. Watch your portfolio grow automatically.',
              },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="text-8xl font-display font-bold text-primary/10 mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2 -mt-12">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
                {index < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/3 -right-4 h-8 w-8 text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border border-primary/30 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(142_76%_45%_/_0.1)_0%,_transparent_70%)]" />
            <div className="relative z-10">
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">
                Ready to Start Investing?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join over 25,000 investors who trust Green Bull with their crypto investments. Start earning passive income today.
              </p>
              <Link to="/signup">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 glow-green">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Green Bull" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-display text-xl font-bold text-foreground">Green Bull</span>
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2024 Green Bull. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
