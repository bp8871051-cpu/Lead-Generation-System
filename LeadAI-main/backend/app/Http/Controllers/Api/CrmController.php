<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Note;
use App\Models\Task;
use Illuminate\Http\Request;

class CrmController extends Controller
{
    public const PIPELINE_STAGES = ["New", "Contacted", "Interested", "Meeting", "Proposal Sent", "Won", "Lost"];

    public function pipeline(Request $request)
    {
        $leads = Lead::with('business', 'assignedUser')->get();
        $groups = array_fill_keys(self::PIPELINE_STAGES, []);

        foreach ($leads as $lead) {
            $stage = in_array($lead->status, self::PIPELINE_STAGES) ? $lead->status : "New";
            $groups[$stage][] = $lead;
        }

        return response()->json($groups);
    }

    public function updateLeadStage($leadId, Request $request)
    {
        $request->validate(['status' => 'required|string']);
        $newStatus = $request->status;

        if (!in_array($newStatus, self::PIPELINE_STAGES)) {
            return response()->json(['detail' => "Invalid pipeline status. Must be one of " . implode(', ', self::PIPELINE_STAGES)], 400);
        }

        $lead = Lead::with('business')->find($leadId);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $oldStatus = $lead->status;
        $lead->status = $newStatus;
        $lead->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'LEAD_STAGE_CHANGE',
            'description' => "Moved lead '{$lead->business->name}' from '{$oldStatus}' to '{$newStatus}'",
        ]);

        return response()->json($lead);
    }

    public function addNote($leadId, Request $request)
    {
        $request->validate(['content' => 'required|string']);

        $lead = Lead::with('business')->find($leadId);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $newNote = Note::create([
            'lead_id' => $lead->id,
            'content' => $request->content,
            'author_name' => $request->user()->full_name ?: $request->user()->email,
            'user_id' => $request->user()->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'NOTE_CREATE',
            'description' => "Added note to lead '{$lead->business->name}'",
        ]);

        return response()->json($newNote);
    }

    public function getNotes($leadId, Request $request)
    {
        $lead = Lead::find($leadId);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $notes = Note::where('lead_id', $lead->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notes);
    }

    public function addTask($leadId, Request $request)
    {
        $request->validate(['title' => 'required|string']);

        $lead = Lead::with('business')->find($leadId);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $newTask = Task::create([
            'lead_id' => $lead->id,
            'title' => $request->title,
            'due_date' => $request->due_date,
            'status' => 'Pending',
            'assigned_to_user_id' => $request->user()->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TASK_CREATE',
            'description' => "Created task '{$request->title}' for lead '{$lead->business->name}'",
        ]);

        return response()->json($newTask);
    }

    public function getTasks($leadId, Request $request)
    {
        $lead = Lead::find($leadId);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $tasks = Task::where('lead_id', $lead->id)
            ->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tasks);
    }

    public function updateTaskStatus($taskId, Request $request)
    {
        $request->validate(['status' => 'required|string']);

        $task = Task::find($taskId);
        if (!$task) {
            return response()->json(['detail' => 'Task not found'], 404);
        }

        $task->status = $request->status;
        $task->save();

        return response()->json($task);
    }
}
