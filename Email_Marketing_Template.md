# Create an email marketing dashboard with the following components:

## Hero Section

- Display key metrics in individual cards: Total Sends, Opens, Clicks, Bounces, and Unsubscribes
- Each metric should show current value with percentage change from previous period
- Use distinct colors and icons for easy identification

## Funnel Visualization

- Create a horizontal funnel showing email campaign progression
- Display metrics in descending order: Sends > Opens > Clicks > Bounces > Unsubscribes
- Use contrasting colors to distinguish each stage
- Include percentage rates between stages

## Campaign Selection

- Add a dropdown menu labeled "Select Campaign"
- Populate with demo campaign names
- Update all visualizations when a campaign is selected
- Include a "View All" option

## Contact List Table

- Columns: Email Address, Status, Last Activity Date
- Status badges: Sent (gray), Opened (blue), Clicked (green), Bounced (red)
- Enable sorting and filtering
- Show 10 entries per page with pagination

## Action Items

- Add a "Resend" button next to bounced emails
- Include tooltip: "Click to create re-send segment"
- Show confirmation modal when clicked

## Template Management Tab

- Display template thumbnails in a responsive grid
- Include template name and last modified date
- Add "Create New Template" button in top right
- Show placeholder editor when creating new template

## Design Requirements:

- Use a clean, modern interface
- Ensure mobile responsiveness
- Maintain consistent color scheme
- Include loading states for all dynamic content
- Implement hover states for interactive elements