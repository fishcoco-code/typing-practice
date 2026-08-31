class_name ScopeOverlay
extends Control


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	queue_redraw()


func _draw() -> void:
	var center := size * 0.5
	var radius := minf(size.x, size.y) * 0.43
	var dark := Color(0.0, 0.0, 0.0, 0.92)
	draw_rect(Rect2(Vector2.ZERO, Vector2(size.x, center.y - radius)), dark)
	draw_rect(Rect2(Vector2(0, center.y + radius), Vector2(size.x, size.y - center.y - radius)), dark)
	draw_rect(Rect2(Vector2(0, center.y - radius), Vector2(center.x - radius, radius * 2.0)), dark)
	draw_rect(Rect2(Vector2(center.x + radius, center.y - radius), Vector2(size.x - center.x - radius, radius * 2.0)), dark)
	draw_arc(center, radius, 0.0, TAU, 96, Color.BLACK, 6.0, true)
	draw_line(center - Vector2(radius, 0), center + Vector2(radius, 0), Color(0.05, 0.05, 0.05, 0.95), 2.0)
	draw_line(center - Vector2(0, radius), center + Vector2(0, radius), Color(0.05, 0.05, 0.05, 0.95), 2.0)
	draw_circle(center, 2.5, Color("d71920"))


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()
