# Calendar View Guide

## Overview

The Calendar View provides a visual overview of all scheduled jobs with color-coding by region and tech assignment status. This makes it easy to see availability, plan assignments, and manage your schedule across Austin, San Antonio, and outsourced areas.

## Accessing the Calendar

Navigate to: `http://localhost:3000/admin/calendar`

Or click the "📅 Calendar View" button from the Jobs collection list.

## Color Coding System

### By Region:
- **Blue** - Austin Area jobs
- **Green** - San Antonio Area jobs  
- **Amber/Orange** - Outsourced to other areas
- **Gray** - Other/unspecified region

### By Assignment Status:
- **Solid border** - Tech assigned (ready to go)
- **Dashed border** - Unassigned (needs tech assignment)
- **Opacity** - Unassigned jobs appear slightly faded

## Automatic Region Detection

When creating jobs via the Quick Create feature, the system automatically detects the region based on the city:

### Austin Area Cities:
- Austin
- Round Rock
- Cedar Park
- Pflugerville
- Georgetown
- Leander
- Manor
- Dripping Springs
- Bee Cave
- Lakeway

### San Antonio Area Cities:
- San Antonio
- New Braunfels
- Schertz
- Seguin
- Universal City
- Converse
- Live Oak
- Boerne

### Outsourced:
- Any job marked as `isOutsourced: true` automatically gets the "Outsourced" region
- These are typically jobs from partners like Matterport in areas outside your service zones

## Calendar Views

The calendar supports multiple view modes:
- **Month** - See the whole month at a glance
- **Week** - Detailed weekly view
- **Day** - Focus on a single day
- **Agenda** - List view of upcoming jobs

## Using the Calendar

### Viewing Job Details:
- **Click any event** to open the full job details page
- **Hover over events** to see a tooltip with:
  - Job name
  - City
  - Assigned tech (or "Unassigned")
  - Job status

### Planning Workflow:
1. **Check availability** - Look for gaps in the calendar
2. **Identify unassigned jobs** - Dashed borders indicate jobs needing tech assignment
3. **Review by region** - Color coding helps you group jobs by area
4. **Assign techs** - Click a job to open it and assign a technician
5. **Calendar invite sent** - When you assign a tech, they automatically receive a Google Calendar invite

### Tech Assignment Visibility:
- Jobs show the tech's name in the event title: `"Job Name - Tech Name"`
- Unassigned jobs show: `"Job Name (Unassigned)"`
- This makes it easy to see who's working when and where

## Region Field

Each job has a `region` field that can be:
- Set automatically during Quick Create (based on city)
- Manually changed when editing a job
- Used for filtering and reporting

To manually change a job's region:
1. Open the job details
2. Find the "Service Region" dropdown
3. Select: Austin Area, San Antonio Area, Outsourced, or Other

## Tips for Effective Scheduling

1. **Color grouping** - Try to group same-color (same-region) jobs on the same day for efficiency
2. **Unassigned tracking** - Regularly check for dashed-border events that need tech assignment
3. **Multi-view planning** - Use Month view for overview, Week view for detailed planning
4. **Tech workload** - Quickly see how many jobs each tech has by scanning their names
5. **Outsourced visibility** - Amber events clearly show which jobs are outsourced work

## Technical Details

### Data Source:
- Calendar pulls from `/api/jobs` endpoint
- Shows all jobs with a `targetDate` set
- Updates when you refresh the page

### Event Duration:
- Default: 2 hours per job
- Start time: From the job's `targetDate`
- End time: 2 hours after start

### Navigation:
- Use toolbar buttons to navigate months/weeks
- Click "Today" to jump to current date
- Use view buttons to switch between Month/Week/Day/Agenda

## Troubleshooting

**Calendar not showing jobs:**
- Ensure jobs have a `targetDate` set
- Check that the dev server is running
- Refresh the page

**Wrong region color:**
- Edit the job and manually set the correct region
- Check if the city name matches the auto-detection list

**Tech not showing:**
- Assign a technician to the job
- The calendar will update on next page load

## Future Enhancements

Potential features to add:
- Tech availability blocking (mark techs as unavailable on certain dates)
- Drag-and-drop to reschedule jobs
- Filter by tech, region, or status
- Export calendar to external calendar apps
- Real-time updates without page refresh

## Related Features

- **Quick Create Job** - `/admin/quick-create-job` - Create jobs from email content
- **Jobs Collection** - `/admin/collections/jobs` - Full job management
- **Google Calendar Integration** - Automatic calendar invites when tech is assigned
