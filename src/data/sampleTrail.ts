export interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'article' | 'quiz' | 'image' | 'reward';
  source?: string;
  duration?: number; // in minutes
  thumbnail?: string; // URL for the thumbnail image
}

export interface Trail {
  id: string;
  title: string;
  creator: string;
  description: string;
  steps: TrailStep[];
  suggestedInvestment: number; // in dollars
}

export const sampleTrail: Trail = {
  id: "trail-1",
  title: "Introduction to Web Development",
  creator: "Jane Smith",
  description: "Learn the basics of HTML, CSS, and JavaScript in this beginner-friendly trail.",
  steps: [
    {
      id: "step-1",
      title: "HTML Fundamentals",
      content: "HTML is the standard markup language for Web pages. With HTML you can create your own website. HTML is easy to learn - You will enjoy it!",
      type: "video",
      duration: 5,
      thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500&auto=format&fit=crop",
      source: "https://www.youtube.com/watch?v=qz0aGYrrlhU"
    },
    {
      id: "step-2",
      title: "CSS Styling",
      content: "CSS is the language we use to style an HTML document. CSS describes how HTML elements should be displayed.",
      type: "video",
      duration: 8,
      thumbnail: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500&auto=format&fit=crop",
      source: "https://www.youtube.com/watch?v=1PnVor36_40"
    },
    {
      id: "step-3",
      title: "JavaScript Basics",
      content: "JavaScript is the world's most popular programming language. JavaScript is the programming language of the Web.",
      type: "video",
      duration: 10,
      thumbnail: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=500&auto=format&fit=crop",
      source: "https://www.youtube.com/watch?v=W6NZfCO5SIk"
    },
    {
      id: "step-4",
      title: "Building Your First Webpage",
      content: "Now let's put everything together to build your first complete webpage.",
      type: "article",
      duration: 15,
      thumbnail: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=500&auto=format&fit=crop"
    }
  ],
  suggestedInvestment: 20 // $20 dollars
};
