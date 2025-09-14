// src/lib/calendar.ts
"use server";

import fs from 'fs';
import path from 'path';
import { callGemini } from './utils';

// Define the structure for date events
export interface DateEvent {
  date: string;
  context: string;
  description: string;
  location?: string;
  participants?: string[];
}

/**
 * Extract future dates with context from document text
 * @param docText The document text to analyze
 * @returns Array of date events
 */
export async function extractFutureDatesWithContext(docText: string): Promise<DateEvent[]> {
  try {
    const prompt = `
      You are an expert legal date extractor. Extract ALL future dates from this legal document with their context.
      
      For each future date found, provide:
      1. The exact date in YYYY-MM-DD format
      2. The surrounding context (the sentence or clause containing the date)
      3. A brief description of what this date represents (hearing, filing deadline, etc.)
      4. Location information if available
      5. Participants involved if available
      
      Return the results as a JSON array with this structure:
      [
        {
          "date": "YYYY-MM-DD",
          "context": "the full sentence or clause containing the date",
          "description": "brief description of what this date represents",
          "location": "location if available",
          "participants": ["list", "of", "participants"]
        },
        ...
      ]
      
      Only include dates that are in the future. If no future dates are found, return an empty array [].
      
      Document text:
      ${docText}
    `;

    const response = await callGemini(prompt);
    
    try {
      // Clean and parse the JSON response
      const cleanedResponse = response.replace(/```json|```/g, '').trim();
      const dates = JSON.parse(cleanedResponse);
      return Array.isArray(dates) ? dates : [];
    } catch (parseError) {
      console.error('Error parsing dates JSON:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error extracting dates:', error);
    return [];
  }
}

/**
 * Save extracted dates to a JSON file
 * @param dates Array of date events
 * @param filename Name of the file to save
 * @returns Path to the saved file
 */
export async function saveDatesToJson(dates: DateEvent[], filename: string): Promise<string> {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(dates, null, 2));
    
    return filePath;
  } catch (error) {
    console.error('Error saving dates to JSON:', error);
    return '';
  }
}

/**
 * Add events to Google Calendar
 * @param dates Array of date events
 * @param calendarId Calendar ID to add events to
 * @returns Success status
 */
export async function addEventsToCalendar(dates: DateEvent[], calendarId: string): Promise<boolean> {
  try {
    // This is a placeholder for actual Google Calendar API integration
    // In a real implementation, you would use the Google Calendar API to add events
    console.log(`Would add ${dates.length} events to calendar ${calendarId}`);
    
    // For each date, create a calendar event
    for (const event of dates) {
      console.log(`Creating event: ${event.description} on ${event.date}`);
      // Here you would make the actual API call to create the event
    }
    
    return true;
  } catch (error) {
    console.error('Error adding events to calendar:', error);
    return false;
  }
}

/**
 * Generate suggested reminders based on document dates
 * @param dates Array of date events
 * @returns Suggested reminders with timing
 */
export async function generateReminders(dates: DateEvent[]): Promise<any[]> {
  try {
    if (!dates.length) return [];
    
    const reminders = dates.map(event => {
      // Create reminders at different intervals before the event
      const eventDate = new Date(event.date);
      
      return {
        event: event.description,
        date: event.date,
        reminders: [
          { days: 7, date: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { days: 3, date: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { days: 1, date: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ]
      };
    });
    
    return reminders;
  } catch (error) {
    console.error('Error generating reminders:', error);
    return [];
  }
}