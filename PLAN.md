

This plan outlines the architecture and step-by-step implementation strategy for three key mobile-first features:       

 1 Swipe Navigation between tournament tabs.                                                                            
 2 Native Web Share integration.                                                                                        
 3 Pull-to-Refresh for live tournament updates.                                                                         

------------------------------------------------------------------------------------------------------------------------


1. Architecture & Component Design                                                                                      

A. Swipe Navigation (SwipeNavigator)                                                                                    

 • Purpose: Allow users to swipe left or right on their mobile screens to transition smoothly between tournament tabs   
   (Info, Starting Rank, Pairings, Standings, Alphabetical).                                                            
 • Mechanism:                                                                                                           
    • Wrap the tournament layout's children in a client-side touch gesture detector.                                    
    • Track onTouchStart and onTouchEnd events.                                                                         
    • Calculate horizontal delta ($\Delta X$) and vertical delta ($\Delta Y$) to prevent diagonal or accidental         
      scrolling triggers.                                                                                               
    • Define a threshold (e.g., $\Delta X > 75\text{px}$ and $\Delta Y < 40\text{px}$) and a minimum velocity/time limit
      to ensure the gesture was an intentional swipe.                                                                   
    • Map the current pathname to the ordered list of tabs:                                                             
       1 /tournaments/[slug] (Info)                                                                                     
       2 /tournaments/[slug]/starting-rank                                                                              
       3 /tournaments/[slug]/pairings                                                                                   
       4 /tournaments/[slug]/standings                                                                                  
       5 /tournaments/[slug]/alphabetical                                                                               
    • Trigger router.push() to navigate to the next or previous tab.                                                    

B. Native Web Share (ShareButton)                                                                                       

 • Purpose: Provide a native mobile sharing experience (triggering the OS share sheet for messaging apps, social media, 
   or system clipboard).                                                                                                
 • Mechanism:                                                                                                           
    • Check if navigator.share is available in the current browser environment.                                         
    • If available, render a button that calls navigator.share({ title, url }).                                         
    • If unavailable (e.g., older browsers, desktop, or non-secure contexts), fall back to copying the URL to the       
      clipboard using navigator.clipboard.writeText and display a temporary "Copied!" tooltip.                          

C. Pull-to-Refresh (PullToRefresh)                                                                                      

 • Purpose: Allow spectators in a physical tournament hall to pull down on the screen to instantly refresh pairings and 
   standings.                                                                                                           
 • Mechanism:                                                                                                           
    • Track vertical touch movements (touchmove) when the scroll container is at scrollTop === 0.                       
    • Apply a resistance factor to the pull distance so the drag feels natural.                                         
    • Display a CSS-animated pull indicator (e.g., a spinning arrow) that rotates as the user pulls down.               
    • Once the pull exceeds a threshold (e.g., 70px), trigger router.refresh() to re-run the Next.js server components  
      and fetch fresh data from the database.                                                                           
    • Reset the pull state once the refresh completes.                                                                  

------------------------------------------------------------------------------------------------------------------------


2. Step-by-Step Implementation Plan                                                                                     

Phase 1: Test Setup & Mocking                                                                                           

 1 Configure Test Environment: Ensure vitest and @testing-library/react are ready to test touch events and browser APIs 
   like navigator.share and navigator.clipboard.                                                                        
 2 Write Failing Tests:                                                                                                 
    • Create SwipeNavigator.test.tsx with tests simulating left and right swipes, asserting that router.push is called  
      with the correct paths.                                                                                           
    • Create ShareButton.test.tsx with tests mocking navigator.share and navigator.clipboard.writeText, asserting       
      correct fallback behavior.                                                                                        
    • Create PullToRefresh.test.tsx with tests simulating a pull-down gesture, asserting that router.refresh is         
      triggered.                                                                                                        

Phase 2: Component Implementation                                                                                       

 3 Implement SwipeNavigator:                                                                                            
    • Create the component using React state to track touch coordinates.                                                
    • Integrate with next-intl navigation hooks (useRouter, usePathname) to ensure locale-aware routing.                
 4 Implement ShareButton:                                                                                               
    • Create a lightweight, accessible button component.                                                                
    • Style it to fit cleanly into the tournament header or layout.                                                     
 5 Implement PullToRefresh:                                                                                             
    • Create the touch-tracking wrapper.                                                                                
    • Add smooth CSS transitions for the pull indicator.                                                                

Phase 3: Integration & Verification                                                                                     

 6 Update Tournament Layout:                                                                                            
    • Modify frontend-next/src/app/[locale]/tournaments/[slug]/layout.tsx to wrap the tab content with SwipeNavigator   
      and PullToRefresh.                                                                                                
    • Add the ShareButton next to the tournament title or metadata.                                                     
 7 Run Tests: Run the test suite to verify that all TDD tests pass.                                                     
 8 Manual Mobile Verification: Verify touch responsiveness, swipe thresholds, and share sheet triggers on actual mobile 
   viewports.                  