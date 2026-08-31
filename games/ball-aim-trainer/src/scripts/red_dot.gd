class_name RedDot
extends Control

var dot_diameter := 8.0


func set_dot_diameter(value: float) -> void:
	dot_diameter = value
	var half_size := (dot_diameter + 4.0) * 0.5
	offset_left = -half_size
	offset_top = -half_size
	offset_right = half_size
	offset_bottom = half_size
	queue_redraw()


func _draw() -> void:
	var center := size * 0.5
	draw_circle(center, dot_diameter * 0.5 + 1.5, Color(0.18, 0.015, 0.02, 0.92))
	draw_circle(center, dot_diameter * 0.5, Color("ed1c24"))
